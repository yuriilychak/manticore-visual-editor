import {
    dxt5_prepare,
    etc2_prepare,
    initSync,
    tex_finalize,
    tex_init,
} from './wasm_glue.js';
import type {
    TextureCompressionFormat,
    TextureCompressionOptions,
    TextureCompressionResult,
    TextureCompressorOptions,
} from './types';

const FORMAT_ID: Record<TextureCompressionFormat, number> = { etc2: 0, dxt5: 1 };

interface WorkerSlot {
    worker: Worker;
    pending: Map<number, { resolve: (data: Uint8Array) => void; reject: (error: Error) => void }>;
}

/**
 * Parallel ETC2/BC3 compressor. Input and output are always straight-alpha
 * RGBA; the compressor neither premultiplies nor changes source pixels.
 */
export class TextureCompressor {
    private constructor(private readonly wasmBinary: ArrayBuffer, private readonly workerSource: TextureCompressorOptions['workerSource'], private readonly requestedWorkers?: number) {}

    static async create(options: TextureCompressorOptions): Promise<TextureCompressor> {
        if ((options.wasmBinary == null) === (options.wasmUrl == null)) {
            throw new Error('TextureCompressor.create requires exactly one of wasmBinary or wasmUrl');
        }
        const wasmBinary = options.wasmBinary ?? await (await fetch(options.wasmUrl as RequestInfo)).arrayBuffer();
        initSync(wasmBinary);
        return new TextureCompressor(wasmBinary, options.workerSource, options.numWorkers);
    }

    async compress(format: TextureCompressionFormat, options: TextureCompressionOptions): Promise<TextureCompressionResult> {
        this.validate(options);
        const formatId = FORMAT_ID[format];
        tex_init(formatId);
        const prepared = format === 'etc2'
            ? etc2_prepare(options.pixels, options.width, options.height, options.retina ?? false, options.ignoreAlphaMask ?? false)
            : dxt5_prepare(options.pixels, options.width, options.height, options.ignoreAlphaMask ?? false);
        const view = new DataView(prepared.buffer, prepared.byteOffset, prepared.byteLength);
        const width = view.getUint16(0, true);
        const height = view.getUint16(2, true);
        const headerSize = format === 'etc2' ? 4 : 8;
        const blockSize = format === 'etc2' ? 80 : 64;
        const blocks = prepared.subarray(headerSize);
        if (blocks.byteLength % blockSize !== 0) throw new Error('Invalid compressor block data');

        const availableWorkers = typeof navigator === 'undefined' ? 4 : (navigator.hardwareConcurrency || 4);
        const workerCount = Math.max(1, Math.min(this.requestedWorkers ?? availableWorkers, blocks.byteLength / blockSize || 1));
        const chunks = splitChunks(blocks, blockSize, workerCount);
        const results = await this.compressChunks(chunks, formatId, options.ignoreAlphaMask ?? false);
        const joined = join(results);
        const finalized = tex_finalize(joined, width, height, formatId, options.debug ?? false);
        return parseFinalized(finalized, format, width, height, options.debug ?? false);
    }

    private async compressChunks(chunks: Uint8Array[], format: number, mask: boolean): Promise<Uint8Array[]> {
        const slots = await Promise.all(chunks.map(() => this.createWorker(format)));
        try {
            return await Promise.all(chunks.map((chunk, index) => this.run(slots[index], index, chunk, format, mask)));
        } finally {
            slots.forEach(slot => slot.worker.terminate());
        }
    }

    private createWorker(format: number): Promise<WorkerSlot> {
        const worker = typeof this.workerSource === 'function'
            ? this.workerSource()
            : new Worker(this.workerSource as string | URL, { type: 'module' });
        const slot: WorkerSlot = { worker, pending: new Map() };
        return new Promise((resolve, reject) => {
            worker.onmessage = (event: MessageEvent) => {
                if (event.data.type === 'ready') resolve(slot);
                else if (event.data.type === 'error') reject(new Error(event.data.message));
                else if (event.data.type === 'result') {
                    const pending = slot.pending.get(event.data.id);
                    slot.pending.delete(event.data.id);
                    pending?.resolve(new Uint8Array(event.data.data));
                }
            };
            worker.onerror = event => reject(new Error(event.message));
            const wasmBinary = this.wasmBinary.slice(0);
            worker.postMessage({ type: 'init', format, wasmBinary }, [wasmBinary]);
        });
    }

    private run(slot: WorkerSlot, id: number, chunk: Uint8Array, format: number, mask: boolean): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            slot.pending.set(id, { resolve, reject });
            slot.worker.postMessage({ type: 'compress', id, format, mask, chunk }, [chunk.buffer]);
        });
    }

    private validate({ pixels, width, height }: TextureCompressionOptions): void {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 65535 || height > 65535) throw new Error('Texture dimensions must be integer values from 1 to 65535');
        if (pixels.byteLength !== width * height * 4) throw new Error('Texture pixels must contain exactly width × height × 4 RGBA bytes');
    }
}

/** Create a compressor using this package's bundled worker and WASM binary. */
export function createTextureCompressor(): Promise<TextureCompressor> {
    return TextureCompressor.create({
        wasmUrl: new URL('../../core/dist/texture-compressor.wasm', import.meta.url),
        workerSource: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    });
}

function splitChunks(data: Uint8Array, blockSize: number, count: number): Uint8Array[] {
    const total = data.byteLength / blockSize;
    return Array.from({ length: count }, (_, index) => {
        const start = Math.floor(total * index / count) * blockSize;
        const end = Math.floor(total * (index + 1) / count) * blockSize;
        return data.slice(start, end);
    }).filter(chunk => chunk.byteLength > 0);
}

function join(chunks: Uint8Array[]): Uint8Array {
    const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
}

function parseFinalized(bytes: Uint8Array, format: TextureCompressionFormat, width: number, height: number, debug: boolean): TextureCompressionResult {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint32(0, true);
    let offset = 4;
    const data = bytes.slice(offset, offset + length);
    offset += length;
    const metrics = {
        alphaPsnr: view.getFloat64(offset, true), alphaSsim: view.getFloat64(offset + 8, true),
        colorWeightedPsnr: view.getFloat64(offset + 16, true), colorWeightedSsim: view.getFloat64(offset + 24, true),
    };
    offset += 32;
    const result: TextureCompressionResult = { format, width, height, data, metrics };
    if (debug) {
        const debugWidth = view.getUint32(offset, true);
        const debugHeight = view.getUint32(offset + 4, true);
        if (debugWidth !== width || debugHeight !== height) throw new Error('Invalid compressor debug output dimensions');
        result.debugRgba = bytes.slice(offset + 8);
    }
    return result;
}
