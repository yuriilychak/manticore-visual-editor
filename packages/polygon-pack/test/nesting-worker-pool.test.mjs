import assert from 'node:assert/strict';
import test from 'node:test';

let fetchCount = 0;
let workerCount = 0;
const transferredWasm = [];

class MockWorker {
	constructor() {
		workerCount += 1;
		this.terminated = false;
	}

	postMessage(message, transfer) {
		if (message.type === 'init') {
			transferredWasm.push({ wasm: message.wasm, transfer: transfer[0] });
			queueMicrotask(() => this.onmessage({ data: { type: 'ready' } }));
		}
	}

	terminate() {
		this.terminated = true;
	}
}

globalThis.navigator = { hardwareConcurrency: 2 };
globalThis.Worker = MockWorker;
globalThis.fetch = async () => {
	fetchCount += 1;
	return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
};

const { NestingWorkerPool } = await import('../src/workers/nesting-worker-pool.js');
const { PolygonPack } = await import('../src/polygon-pack.js');

test('fetches WASM once and copies its buffer for each worker initialization', async () => {
	const pool = new NestingWorkerPool('/workers/nesting.worker.js', 2);
	await pool.initialization;

	assert.equal(fetchCount, 1);
	assert.equal(transferredWasm.length, 2);
	assert.notStrictEqual(transferredWasm[0].wasm, transferredWasm[1].wasm);
	assert.strictEqual(transferredWasm[0].wasm, transferredWasm[0].transfer);
	assert.strictEqual(transferredWasm[1].wasm, transferredWasm[1].transfer);
	pool.terminate();
});

test('does not spawn a worker pool until nesting actually starts', () => {
	const workersBefore = workerCount;
	const pack = new PolygonPack();

	assert.equal(workerCount, workersBefore);
	pack.terminate();
});
