export type ColorMarginCluster = { data: Uint8Array; height: number; padding: number; scaleFix: boolean; width: number };

type PendingTask = { reject: (error: Error) => void; resolve: (cluster: Uint8Array) => void };
type QueuedTask = { cluster: ColorMarginCluster; id: number; pending: PendingTask };
type PoolWorker = { busy: boolean; pending: PendingTask | null; worker: Worker };

export type TextureAtlasClusterWorkerPoolOptions = {
  numWorkers: number;
  wasmBinary: ArrayBuffer;
  workerSource: string | URL | (() => Worker);
};

/** Worker pool that processes independent padded sprite clusters in parallel. */
export class TextureAtlasClusterWorkerPool {
  private readonly workers: PoolWorker[] = [];
  private readonly queue: QueuedTask[] = [];

  private constructor() {}

  static async create({ numWorkers, wasmBinary, workerSource }: TextureAtlasClusterWorkerPoolOptions): Promise<TextureAtlasClusterWorkerPool> {
    const pool = new TextureAtlasClusterWorkerPool();
    await Promise.all(Array.from({ length: numWorkers }, async () => {
      const worker = typeof workerSource === 'function' ? workerSource() : new Worker(workerSource, { type: 'module' });
      const poolWorker: PoolWorker = { busy: false, pending: null, worker };
      pool.workers.push(poolWorker);
      await new Promise<void>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          if (event.data.type === 'ready') { worker.removeEventListener('message', onMessage); resolve(); }
          else if (event.data.type === 'error') { worker.removeEventListener('message', onMessage); reject(new Error(event.data.message)); }
        };
        worker.addEventListener('message', onMessage);
        const workerWasm = wasmBinary.slice(0);
        worker.postMessage({ type: 'init', wasmBinary: workerWasm }, [workerWasm]);
      });
      worker.addEventListener('message', event => pool.handleMessage(poolWorker, event));
      worker.addEventListener('error', event => pool.handleError(poolWorker, new Error(event.message)));
    }));
    return pool;
  }

  async process(clusters: readonly ColorMarginCluster[]): Promise<Uint8Array[]> {
    return Promise.all(clusters.map((cluster, id) => new Promise<Uint8Array>((resolve, reject) => {
      const task: QueuedTask = { cluster, id, pending: { reject, resolve } };
      const worker = this.workers.find(candidate => !candidate.busy);
      if (worker) this.dispatch(worker, task);
      else this.queue.push(task);
    })));
  }

  terminate(): void {
    this.queue.splice(0).forEach(({ pending }) => pending.reject(new Error('Texture-atlas clusterizer worker pool was terminated.')));
    this.workers.splice(0).forEach(({ worker }) => worker.terminate());
  }

  private dispatch(poolWorker: PoolWorker, { cluster, id, pending }: QueuedTask): void {
    poolWorker.busy = true;
    poolWorker.pending = pending;
    poolWorker.worker.postMessage({ ...cluster, id, type: 'cluster' }, [cluster.data.buffer]);
  }

  private handleMessage(poolWorker: PoolWorker, event: MessageEvent): void {
    if (event.data.type === 'ready') return;
    const pending = poolWorker.pending;
    poolWorker.busy = false;
    poolWorker.pending = null;
    if (event.data.type === 'result') pending?.resolve(new Uint8Array(event.data.cluster));
    else if (event.data.type === 'error') pending?.reject(new Error(event.data.message));
    this.drain();
  }

  private handleError(poolWorker: PoolWorker, error: Error): void {
    poolWorker.pending?.reject(error);
    poolWorker.pending = null;
    poolWorker.busy = false;
    this.drain();
  }

  private drain(): void {
    while (this.queue.length) {
      const worker = this.workers.find(candidate => !candidate.busy);
      if (!worker) return;
      this.dispatch(worker, this.queue.shift()!);
    }
  }
}
