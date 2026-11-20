// Relative paths also work when the Electron renderer is loaded from file://.
const WASM_URL = './workers/poygon_pack_algo_bg.wasm';

let wasmBinaryPromise;

/** Fetches the worker WASM binary once, for copying into each worker. */
export function loadWasmBinary() {
	if (!wasmBinaryPromise) {
		wasmBinaryPromise = fetch(WASM_URL).then((response) => {
			if (!response.ok) throw new Error(`Failed to fetch nesting WASM: ${response.status} ${response.statusText}`);
			return response.arrayBuffer();
		});
	}
	return wasmBinaryPromise;
}

/**
 * Creates the small wasm-bindgen ABI surface the polygon engine requires.
 * This intentionally accepts bytes so workers never fetch the WASM asset.
 */
export async function createNfpWasm(binary) {
	if (!(binary instanceof ArrayBuffer)) throw new TypeError('Nesting WASM must be an ArrayBuffer');

	let wasm;
	let cachedFloat64Memory;
	const imports = {
		'./poygon_pack_algo_bg.js': {
			__wbindgen_init_externref_table() {
				const table = wasm.__wbindgen_externrefs;
				table.set(0, undefined);
				table.set(1024, undefined);
				table.set(1025, null);
				table.set(1026, true);
				table.set(1027, false);
			}
		}
	};
	const { instance } = await WebAssembly.instantiate(binary, imports);
	wasm = instance.exports;
	wasm.__wbindgen_start();

	function float64Memory() {
		if (!cachedFloat64Memory || cachedFloat64Memory.byteLength === 0) {
			cachedFloat64Memory = new Float64Array(wasm.memory.buffer);
		}
		return cachedFloat64Memory;
	}

	return {
		generate(request) {
			const pointer = wasm.__wbindgen_malloc(request.length * Float64Array.BYTES_PER_ELEMENT, Float64Array.BYTES_PER_ELEMENT) >>> 0;
			float64Memory().set(request, pointer / Float64Array.BYTES_PER_ELEMENT);
			const result = wasm.generate(pointer, request.length);
			const values = float64Memory().subarray(result[0] / Float64Array.BYTES_PER_ELEMENT, result[0] / Float64Array.BYTES_PER_ELEMENT + result[1]).slice();
			wasm.__wbindgen_free(result[0], result[1] * Float64Array.BYTES_PER_ELEMENT, Float64Array.BYTES_PER_ELEMENT);
			return values;
		}
	};
}
