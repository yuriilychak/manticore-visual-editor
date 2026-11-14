/**
 * wasm-bindgen bindings for texture-compressor-algo.
 *
 * Kept in the TypeScript package so the generated WebAssembly module remains
 * an implementation detail of the Rust algorithm package, while both the
 * public wrapper and its workers use the same synchronous initialization API.
 */
let wasm;
let bytes;
let i32;
const heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);
let nextHeap = heap.length;

function addHeapObject(value) {
    if (nextHeap === heap.length) heap.push(heap.length + 1);
    const index = nextHeap;
    nextHeap = heap[index];
    heap[index] = value;
    return index;
}

function getHeapObject(index) {
    return heap[index];
}

function dropHeapObject(index) {
    if (index < 132) return;
    heap[index] = nextHeap;
    nextHeap = index;
}

function u8() {
    if (!bytes || bytes.byteLength === 0) bytes = new Uint8Array(wasm.memory.buffer);
    return bytes;
}

function ints() {
    if (!i32 || i32.byteLength === 0) i32 = new Int32Array(wasm.memory.buffer);
    return i32;
}

let vectorLength = 0;
function passU8(value) {
    const pointer = wasm.__wbindgen_malloc(value.length, 1) >>> 0;
    u8().set(value, pointer);
    vectorLength = value.length;
    return pointer;
}

function returnedBytes(pointer, length) {
    const value = u8().subarray(pointer >>> 0, (pointer >>> 0) + length).slice();
    wasm.__wbindgen_free(pointer, length, 1);
    return value;
}

function callBytes(exported, args) {
    const stack = wasm.__wbindgen_add_to_stack_pointer(-16);
    try {
        const pointer = passU8(args.shift());
        exported(stack, pointer, vectorLength, ...args);
        return returnedBytes(ints()[stack / 4], ints()[stack / 4 + 1]);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

export function tex_init(format) {
    wasm.tex_init(format);
}

export function etc2_prepare(rgba, width, height, retina, nomask) {
    return callBytes(wasm.etc2_prepare, [rgba, width, height, retina, nomask]);
}

export function etc2_compress_chunk(chunk) {
    return callBytes(wasm.etc2_compress_chunk, [chunk]);
}

export function dxt5_prepare(rgba, width, height, nomask) {
    return callBytes(wasm.dxt5_prepare, [rgba, width, height, nomask]);
}

export function dxt5_compress_chunk(chunk, mask) {
    return callBytes(wasm.dxt5_compress_chunk, [chunk, mask]);
}

export function tex_finalize(results, width, height, format, debug) {
    return callBytes(wasm.tex_finalize, [results, width, height, format, debug]);
}

function imports() {
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    return {
        wbg: {
            __wbg_new_abda76e883ba8a5f: () => addHeapObject(new Error()),
            __wbg_stack_658279fe44541cf6: (resultPointer, error) => {
                const stack = String(getHeapObject(error).stack ?? '');
                const encoded = new TextEncoder().encode(stack);
                const pointer = wasm.__wbindgen_malloc(encoded.length, 1) >>> 0;
                u8().set(encoded, pointer);
                ints()[resultPointer / 4] = pointer;
                ints()[resultPointer / 4 + 1] = encoded.length;
            },
            __wbg_error_f851667af71bcfc6: (pointer, length) => {
                console.error(decoder.decode(u8().subarray(pointer, pointer + length)));
                wasm.__wbindgen_free(pointer, length, 1);
            },
            __wbindgen_object_drop_ref: dropHeapObject,
        },
    };
}

/** Synchronously initialize from a pre-fetched binary, suitable for workers. */
export function initSync(module) {
    if (wasm) return wasm;
    const compiled = module instanceof WebAssembly.Module ? module : new WebAssembly.Module(module);
    wasm = new WebAssembly.Instance(compiled, imports()).exports;
    bytes = null;
    i32 = null;
    return wasm;
}

/** Asynchronously initialize from a binary or compiled module. */
export default async function init(module) {
    return initSync(module instanceof Promise ? await module : module);
}
