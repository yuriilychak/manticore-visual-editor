import { dxt5_compress_chunk, etc2_compress_chunk, initSync, tex_init } from './wasm_glue.js';

const context: Worker = self as unknown as Worker;
let ready = false;

context.onmessage = (event: MessageEvent) => {
    try {
        if (event.data.type === 'init') {
            initSync(event.data.wasmBinary);
            tex_init(event.data.format);
            ready = true;
            context.postMessage({ type: 'ready' });
            return;
        }

        if (event.data.type === 'compress') {
            if (!ready) throw new Error('Texture compressor worker is not initialized');
            const chunk = new Uint8Array(event.data.chunk);
            const data = event.data.format === 0
                ? etc2_compress_chunk(chunk)
                : dxt5_compress_chunk(chunk, event.data.mask);
            context.postMessage({ type: 'result', id: event.data.id, data }, [data.buffer]);
        }
    } catch (error) {
        context.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
};
