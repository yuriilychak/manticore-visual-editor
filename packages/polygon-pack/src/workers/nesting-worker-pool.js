import { loadWasmBinary } from '../wasm-loader.js';

export class NestingWorkerPool {
	constructor(url, size = Math.max(1, navigator.hardwareConcurrency || 4)) {
		this.workers = [];
		this.queue = [];
		this.closed = false;
		this.ready = false;
		this.initializationError = null;
		this.initialization = loadWasmBinary()
			.then((wasmBinary) => {
				if (this.closed) return;
				return Promise.all(Array.from({ length: size }, () => this.#createWorker(url, wasmBinary.slice(0))));
			})
			.then(() => {
				if (!this.closed) {
					this.ready = true;
					this.#dispatch();
				}
			}, (error) => this.#failInitialization(error));
	}

	request(data) {
		if (this.closed) return Promise.reject(new Error('Nesting worker pool is closed'));
		if (this.initializationError) return Promise.reject(this.initializationError);
		return new Promise((resolve, reject) => {
			this.queue.push({ data, resolve, reject });
			this.#dispatch();
		});
	}

	/** Submits a batch while preserving request order in the returned results. */
	requestAll(requests, onProgress) {
		if (!Array.isArray(requests)) return Promise.reject(new TypeError('Worker requests must be an array'));
		let completed = 0;
		return Promise.all(requests.map((request) => this.request(request).then((result) => {
			completed += 1;
			onProgress?.(completed, requests.length);
			return result;
		})));
	}

	/** Drops queued work while busy workers finish their current WASM call. */
	drain() {
		for (const job of this.queue.splice(0)) job.reject(new Error('Nesting stopped'));
	}

	terminate() {
		this.closed = true;
		this.drain();
		for (const worker of this.workers) {
			worker.worker.terminate();
			if (worker.job) worker.job.reject(new Error('Nesting stopped'));
		}
		this.workers = [];
	}

	#createWorker(url, wasm) {
		return new Promise((resolve, reject) => {
			const worker = { worker: new Worker(url, { type: 'module' }), job: null };
			this.workers.push(worker);
			worker.worker.onmessage = ({ data }) => {
				if (data?.type === 'ready') return resolve();
				if (data?.type === 'init-error') return reject(new Error(data.error));
				this.#complete(worker, null, data);
			};
			worker.worker.onerror = (event) => {
				const error = event.error || new Error(event.message);
				reject(error);
				this.#complete(worker, error);
			};
			worker.worker.postMessage({ type: 'init', wasm }, [wasm]);
		});
	}

	#failInitialization(error) {
		this.initializationError = error instanceof Error ? error : new Error(String(error));
		for (const job of this.queue.splice(0)) job.reject(this.initializationError);
		for (const worker of this.workers) worker.worker.terminate();
		this.workers = [];
	}

	#complete(worker, error, result) {
		const job = worker.job;
		worker.job = null;
		if (job) error ? job.reject(error) : job.resolve(result);
		this.#dispatch();
	}

	#dispatch() {
		if (this.closed || !this.ready) return;
		for (const worker of this.workers) {
			if (worker.job || this.queue.length === 0) continue;
			worker.job = this.queue.shift();
			const transfer = worker.job.data instanceof Float64Array ? [worker.job.data.buffer] : [];
			worker.worker.postMessage(worker.job.data, transfer);
		}
	}
}
