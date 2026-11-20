import { createNfpWasm } from '../wasm-loader.js';

let nfpWasm;

self.onmessage = async ({ data }) => {
	if (!nfpWasm) {
		if (data?.type !== 'init') throw new Error('Nesting worker must be initialized before it receives jobs');
		try {
			nfpWasm = await createNfpWasm(data.wasm);
			self.postMessage({ type: 'ready' });
		} catch (error) {
			self.postMessage({ type: 'init-error', error: error instanceof Error ? error.message : String(error) });
		}
		return;
	}
	if (data instanceof Float64Array) {
		const result = nfpWasm.generate(data);
		self.postMessage(result, [result.buffer]);
		return;
	}
	throw new Error(`Unsupported nesting worker request: ${data.type}`);
};
