/** Raw-WASM bindings shared by the texture-atlas clusterizer and its workers. */
interface WasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  allocate(size: number): number;
  deallocate(pointer: number, size: number): void;
  apply_color_margin_in_place(pointer: number, width: number, height: number, padding: number, scaleFix: number): void;
}

export type InitInput = BufferSource | Response | string | URL | WebAssembly.Module;

let wasm: WasmExports | undefined;
let memory: Uint8Array | undefined;

function bytes(): Uint8Array {
  if (!memory || memory.byteLength === 0) memory = new Uint8Array(wasm!.memory.buffer);
  return memory;
}

function finalize(instance: WebAssembly.Instance): WasmExports {
  wasm = instance.exports as unknown as WasmExports;
  memory = undefined;
  return wasm;
}

/** Synchronously initialize from a BufferSource or compiled module. */
export function initSync(module: BufferSource | WebAssembly.Module): WebAssembly.Exports {
  if (wasm) return wasm;
  const compiled = module instanceof WebAssembly.Module ? module : new WebAssembly.Module(module);
  return finalize(new WebAssembly.Instance(compiled, {}));
}

/** Asynchronously initialize from a URL, Response, BufferSource, or compiled module. */
export async function initWasm(moduleOrPath: InitInput): Promise<WebAssembly.Exports> {
  if (wasm) return wasm;
  if (moduleOrPath instanceof WebAssembly.Module || moduleOrPath instanceof ArrayBuffer || ArrayBuffer.isView(moduleOrPath)) {
    return initSync(moduleOrPath);
  }
  const response = moduleOrPath instanceof Response ? moduleOrPath : await fetch(moduleOrPath);
  if (!response.ok) throw new Error('Could not load texture-atlas clusterizer WASM.');
  return initSync(await response.arrayBuffer());
}

/** Pass an RGBA cluster to Rust and return its updated Uint8Array copy. */
export function apply_color_margin(cluster: Uint8Array, width: number, height: number, padding: number, scaleFix: boolean): Uint8Array {
  if (!wasm) throw new Error('Texture-atlas clusterizer WASM is not initialized.');
  const pointer = wasm.allocate(cluster.byteLength);
  try {
    bytes().set(cluster, pointer);
    wasm.apply_color_margin_in_place(pointer, width, height, padding, Number(scaleFix));
    return bytes().subarray(pointer, pointer + cluster.byteLength).slice();
  } finally {
    wasm.deallocate(pointer, cluster.byteLength);
  }
}
