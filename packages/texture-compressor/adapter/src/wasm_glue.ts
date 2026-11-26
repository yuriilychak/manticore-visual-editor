/** wasm-bindgen bindings shared by the compressor and its workers. */
interface WasmExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;
    __wbindgen_malloc(size: number, align: number): number;
    __wbindgen_free(pointer: number, size: number, align: number): void;
    __wbindgen_add_to_stack_pointer(offset: number): number;
    tex_init(format: number): void;
    etc2_prepare(result: number, pointer: number, length: number, width: number, height: number, retina: boolean, nomask: boolean): void;
    etc2_compress_chunk(result: number, pointer: number, length: number): void;
    dxt5_prepare(result: number, pointer: number, length: number, width: number, height: number, nomask: boolean): void;
    dxt5_compress_chunk(result: number, pointer: number, length: number, mask: boolean): void;
    tex_finalize(result: number, pointer: number, length: number, width: number, height: number, format: number, debug: boolean): void;
}

let wasm: WasmExports | undefined;
let bytes: Uint8Array | undefined;
let i32: Int32Array | undefined;
const heap: unknown[] = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);
let nextHeap = heap.length;

function addHeapObject(value: unknown): number {
    if (nextHeap === heap.length) heap.push(heap.length + 1);
    const index = nextHeap;
    nextHeap = heap[index] as number;
    heap[index] = value;
    return index;
}

function getHeapObject(index: number): unknown {
    return heap[index];
}

function dropHeapObject(index: number): void {
    if (index < 132) return;
    heap[index] = nextHeap;
    nextHeap = index;
}

function u8(): Uint8Array {
    if (!bytes || bytes.byteLength === 0) bytes = new Uint8Array(wasm!.memory.buffer);
    return bytes;
}

function ints(): Int32Array {
    if (!i32 || i32.byteLength === 0) i32 = new Int32Array(wasm!.memory.buffer);
    return i32;
}

let vectorLength = 0;
function passU8(value: Uint8Array): number {
    const pointer = wasm!.__wbindgen_malloc(value.length, 1) >>> 0;
    u8().set(value, pointer);
    vectorLength = value.length;
    return pointer;
}

function returnedBytes(pointer: number, length: number): Uint8Array {
    const value = u8().subarray(pointer >>> 0, (pointer >>> 0) + length).slice();
    wasm!.__wbindgen_free(pointer, length, 1);
    return value;
}

function callBytes(exported: (...args: any[]) => void, input: Uint8Array, ...args: (number | boolean)[]): Uint8Array {
    const stack = wasm!.__wbindgen_add_to_stack_pointer(-16);
    try {
        const pointer = passU8(input);
        exported(stack, pointer, vectorLength, ...args);
        return returnedBytes(ints()[stack / 4], ints()[stack / 4 + 1]);
    } finally {
        wasm!.__wbindgen_add_to_stack_pointer(16);
    }
}

export function tex_init(format: number): void {
    wasm!.tex_init(format);
}

export function etc2_prepare(rgba: Uint8Array, width: number, height: number, retina: boolean, nomask: boolean): Uint8Array {
    return callBytes(wasm!.etc2_prepare, rgba, width, height, retina, nomask);
}

export function etc2_compress_chunk(chunk: Uint8Array): Uint8Array {
    return callBytes(wasm!.etc2_compress_chunk, chunk);
}

export function dxt5_prepare(rgba: Uint8Array, width: number, height: number, nomask: boolean): Uint8Array {
    return callBytes(wasm!.dxt5_prepare, rgba, width, height, nomask);
}

export function dxt5_compress_chunk(chunk: Uint8Array, mask: boolean): Uint8Array {
    return callBytes(wasm!.dxt5_compress_chunk, chunk, mask);
}

export function tex_finalize(results: Uint8Array, width: number, height: number, format: number, debug: boolean): Uint8Array {
    return callBytes(wasm!.tex_finalize, results, width, height, format, debug);
}

function imports(): WebAssembly.Imports {
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    return {
        wbg: {
            __wbg_new_abda76e883ba8a5f: () => addHeapObject(new Error()),
            __wbg_stack_658279fe44541cf6: (resultPointer: number, error: number) => {
                const stack = String((getHeapObject(error) as Error).stack ?? '');
                const encoded = new TextEncoder().encode(stack);
                const pointer = wasm!.__wbindgen_malloc(encoded.length, 1) >>> 0;
                u8().set(encoded, pointer);
                ints()[resultPointer / 4] = pointer;
                ints()[resultPointer / 4 + 1] = encoded.length;
            },
            __wbg_error_f851667af71bcfc6: (pointer: number, length: number) => {
                console.error(decoder.decode(u8().subarray(pointer, pointer + length)));
                wasm!.__wbindgen_free(pointer, length, 1);
            },
            __wbindgen_object_drop_ref: dropHeapObject,
        },
    };
}

export function initSync(module: BufferSource | WebAssembly.Module): WebAssembly.Exports {
    if (wasm) return wasm;
    const compiled = module instanceof WebAssembly.Module ? module : new WebAssembly.Module(module);
    wasm = new WebAssembly.Instance(compiled, imports()).exports as unknown as WasmExports;
    bytes = undefined;
    i32 = undefined;
    return wasm;
}

export default async function init(module: BufferSource | WebAssembly.Module): Promise<WebAssembly.Exports> {
    return initSync(module);
}
