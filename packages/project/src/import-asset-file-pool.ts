import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

type ImportAssetFileTask = {
  assetPath: string;
  filePath: string;
  imageData: readonly number[] | Uint8Array | undefined;
  imagePreview: readonly number[] | Uint8Array | undefined;
  index: number;
};

type ImportAssetFileResult = { error?: string; index: number };

function workerMain(): void {
  const { copyFile, mkdir, rm, writeFile } = require('node:fs/promises');
  const path = require('node:path');
  const { parentPort } = require('node:worker_threads');

  parentPort.on('message', async (task: ImportAssetFileTask) => {
    try {
      await mkdir(path.dirname(task.assetPath), { recursive: true });
      await mkdir(task.assetPath, { recursive: false });
      await copyFile(task.filePath, path.join(task.assetPath, 'source'));
      if (task.imageData) await writeFile(path.join(task.assetPath, 'asset'), Buffer.from(task.imageData));
      if (task.imagePreview) await writeFile(path.join(task.assetPath, 'preview'), Buffer.from(task.imagePreview));
      parentPort.postMessage({ index: task.index });
    } catch (error) {
      await rm(task.assetPath, { force: true, recursive: true });
      parentPort.postMessage({ error: error instanceof Error ? error.message : 'Import failed.', index: task.index });
    }
  });
}

const WORKER_SOURCE = `(${workerMain.toString()})();`;

function deleteWorkerMain(): void {
  const { rm } = require('node:fs/promises');
  const { parentPort } = require('node:worker_threads');

  parentPort.on('message', async ({ assetPath }: { assetPath: string }) => {
    try {
      await rm(assetPath, { force: true, recursive: true });
      parentPort.postMessage({});
    } catch (error) {
      parentPort.postMessage({ error: error instanceof Error ? error.message : 'Delete failed.' });
    }
  });
}

const DELETE_WORKER_SOURCE = `(${deleteWorkerMain.toString()})();`;

/** Materialize independent asset directories with a bounded Node worker pool. */
export async function materializeImportAssetFiles(tasks: readonly ImportAssetFileTask[]): Promise<Map<number, string | undefined>> {
  if (!tasks.length) return new Map();

  const results = new Map<number, string | undefined>();
  const workerCount = Math.min(tasks.length, Math.max(1, availableParallelism() - 1));
  const workers = Array.from({ length: workerCount }, () => new Worker(WORKER_SOURCE, { eval: true }));
  let nextTaskIndex = 0;

  try {
    await new Promise<void>((resolve, reject) => {
    let completed = 0;

    const assign = (worker: Worker): void => {
      const task = tasks[nextTaskIndex++];
      if (task) worker.postMessage(task);
    };
    const complete = (worker: Worker, result: ImportAssetFileResult): void => {
      results.set(result.index, result.error);
      completed += 1;
      if (completed === tasks.length) {
        resolve();
      } else {
        assign(worker);
      }
    };

    for (const worker of workers) {
      worker.on('message', (result: ImportAssetFileResult) => complete(worker, result));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0 && completed < tasks.length) reject(new Error(`Asset import worker stopped with code ${code}.`));
      });
      assign(worker);
    }
    });
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
  return results;
}

/** Remove asset directories concurrently before their manifest entries are removed. */
export async function deleteImportAssetFiles(assetPaths: readonly string[]): Promise<void> {
  if (!assetPaths.length) return;

  const workerCount = Math.min(assetPaths.length, Math.max(1, availableParallelism() - 1));
  const workers = Array.from({ length: workerCount }, () => new Worker(DELETE_WORKER_SOURCE, { eval: true }));
  let nextPathIndex = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      let completed = 0;
      const assign = (worker: Worker): void => {
        const assetPath = assetPaths[nextPathIndex++];
        if (assetPath) worker.postMessage({ assetPath });
      };
      const complete = (worker: Worker, result: { error?: string }): void => {
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        completed += 1;
        if (completed === assetPaths.length) resolve();
        else assign(worker);
      };

      for (const worker of workers) {
        worker.on('message', (result: { error?: string }) => complete(worker, result));
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0 && completed < assetPaths.length) reject(new Error(`Asset deletion worker stopped with code ${code}.`));
        });
        assign(worker);
      }
    });
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
