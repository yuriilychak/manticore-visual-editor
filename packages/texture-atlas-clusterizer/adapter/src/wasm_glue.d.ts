export type InitInput = ArrayBuffer | ArrayBufferView | Response | string | URL | WebAssembly.Module;

export function initSync(module: ArrayBuffer | ArrayBufferView | WebAssembly.Module): WebAssembly.Exports;
export function initWasm(moduleOrPath: InitInput): Promise<WebAssembly.Exports>;
export function apply_color_margin(cluster: Uint8Array, width: number, height: number, padding: number, scaleFix: boolean): Uint8Array;
