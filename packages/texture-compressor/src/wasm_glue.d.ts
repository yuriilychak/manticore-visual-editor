export function tex_init(format: number): void;
export function etc2_prepare(rgba: Uint8Array, width: number, height: number, retina: boolean, nomask: boolean): Uint8Array;
export function etc2_compress_chunk(chunk: Uint8Array): Uint8Array;
export function dxt5_prepare(rgba: Uint8Array, width: number, height: number, nomask: boolean): Uint8Array;
export function dxt5_compress_chunk(chunk: Uint8Array, mask: boolean): Uint8Array;
export function tex_finalize(results: Uint8Array, width: number, height: number, format: number, debug: boolean): Uint8Array;
export function initSync(module: BufferSource | WebAssembly.Module): WebAssembly.Exports;
export default function init(module: BufferSource | WebAssembly.Module): Promise<WebAssembly.Exports>;
