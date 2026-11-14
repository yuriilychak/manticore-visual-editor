/**
 * maxrects-packer — WASM-accelerated 2D bin packer with WebWorker parallelism.
 *
 * @example
 * ```ts
 * import { MaxRectsPackerWasm } from 'maxrects-packer';
 *
 * const packer = await MaxRectsPackerWasm.create({
 *   wasmUrl: '/maxrects-packer.wasm',
 *   workerSource: new URL('./worker.js', import.meta.url),
 * });
 *
 * const bins = await packer.addArray(rects);
 * packer.terminate();
 * ```
 */

export type { IRectangle, IOption } from './types';
export { packRectangles, type PackRectangle, type PackedRectangle } from './rectangles';
export {
    serializeOptions,
    serializeInputRects,
    deserializeChunks,
    serializeWorkerResults,
    deserializeBins
} from "./serialization";
export type { BinResult } from './serialization';
export { WorkerPool } from './worker_pool';
export type { WorkerPoolOptions } from './worker_pool';
export {
    MaxRectsPackerWasm
} from "./packer";
export type { MaxRectsPackerWasmOptions } from './packer';

// Re-export WASM glue for direct / single-threaded usage
export {
    initWasm,
    initSync,
    MaxRectsPacker,
    process_chunk,
    prepare_chunks,
    merge_results
} from "./wasm_glue.js";
export { default as initWasmDefault } from "./wasm_glue.js";
