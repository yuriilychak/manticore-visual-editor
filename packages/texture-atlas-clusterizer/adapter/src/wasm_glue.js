/**
 * Raw-WASM glue for texture-atlas-clusterizer-algo.
 *
 * This owns WASM initialization and Uint8Array copy-in/copy-out. The public
 * clusterizer API deliberately does not expose WASM pointers or memory.
 */
/* global WebAssembly, Response, fetch */
let wasm;
let memory;

function bytes() {
  if (!memory || memory.byteLength === 0) memory = new Uint8Array(wasm.memory.buffer);
  return memory;
}

function finalize(instance) {
  wasm = instance.exports;
  memory = null;
  return wasm;
}

/** Synchronously initialize from a BufferSource or compiled module. */
export function initSync(module) {
  if (wasm) return wasm;
  const compiled = module instanceof WebAssembly.Module ? module : new WebAssembly.Module(module);
  return finalize(new WebAssembly.Instance(compiled, {}));
}

/** Asynchronously initialize from a URL, Response, BufferSource, or compiled module. */
export async function initWasm(moduleOrPath) {
  if (wasm) return wasm;
  if (moduleOrPath instanceof WebAssembly.Module || moduleOrPath instanceof ArrayBuffer || ArrayBuffer.isView(moduleOrPath)) return initSync(moduleOrPath);
  const response = moduleOrPath instanceof Response ? moduleOrPath : await fetch(moduleOrPath);
  if (!response.ok) throw new Error('Could not load texture-atlas clusterizer WASM.');
  return initSync(await response.arrayBuffer());
}

/** Pass an RGBA cluster to Rust and return its updated Uint8Array copy. */
export function apply_color_margin(cluster, width, height, padding, scaleFix) {
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
