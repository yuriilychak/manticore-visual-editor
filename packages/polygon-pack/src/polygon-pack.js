/*!
 * PolygonPack
 * Licensed under the MIT license
 */

import { NestingWorkerPool } from "./workers/nesting-worker-pool.js";
import {
  deserializeGenerationBegin,
  deserializeGenerationComplete,
  deserializePreparationResult,
  packWorkerConfig,
  serializeGenerationBegin,
  serializeGenerationComplete,
  serializePreparationRequest
} from "./worker-protocol.js";

export class PolygonPack {
  #partPolygons = [];
  #binSource = null;
  #prepared = null;
  #nfpCacheState = new Float64Array([0]);
  #generationState = new Float64Array();
  #workerConfig = packWorkerConfig({
    curveTolerance: 0.3,
    spacing: 0,
    rotations: 4,
    populationSize: 10,
    mutationRate: 10,
    useHoles: false
  });
  #best = null;
  #workerTimer = null;
  #workerPool = null;
  #progress = 0;
  #runId = 0;
  working = false;

  #getWorkerPool() {
      if (!this.#workerPool) {
        this.#workerPool = new NestingWorkerPool("./workers/nesting.worker.js");
      }
      return this.#workerPool;
  }

  async #launchWorkers(runId, displayCallback) {
      if (runId !== this.#runId) return;
      const beginRequest = serializeGenerationBegin({
        workerConfig: this.#workerConfig,
        preparation: this.#prepared,
        state: this.#generationState,
        cacheState: this.#nfpCacheState
      });
      let begun;
      try {
        begun = deserializeGenerationBegin(await this.#getWorkerPool().request(beginRequest));
      } catch {
        return;
      }
      if (runId !== this.#runId) return;
      if (!begun) {
        this.working = false;
        return;
      }
      try {
        const generatedNfp = await this.#getWorkerPool().requestAll(
          begun.jobs,
          (completed, total) => {
            if (runId === this.#runId) this.#progress = completed / total;
          }
        );
        if (runId !== this.#runId) return;
        if (begun.jobs.length === 0) this.#progress = 1;
        const completeRequest = serializeGenerationComplete({
          workerConfig: this.#workerConfig,
          preparation: this.#prepared,
          continuation: begun.continuation,
          results: generatedNfp
        });
        const result = deserializeGenerationComplete(
          await this.#getWorkerPool().request(completeRequest)
        );
        if (runId !== this.#runId) return;
        if (!result) {
          this.working = false;
          return;
        }
        this.#generationState = result.state;
        this.#nfpCacheState = result.cacheState;
        const bestresult = result.placement;
        if (!this.#best || bestresult.fitness < this.#best.fitness) {
          this.#best = bestresult;
          displayCallback(
            this.#best.placements,
            this.#best.placedArea / this.#best.totalArea,
            this.#best.placedCount,
            result.partCount
          );
        } else {
          displayCallback();
        }
      } catch {}
      if (runId === this.#runId) this.working = false;
  }

  setParts(polygons) {
      this.stop();
      this.#partPolygons = polygons;
      this.#binSource = null;
      this.#prepared = null;
      this.#best = null;
      this.#generationState = new Float64Array();
      this.#nfpCacheState = new Float64Array([0]);
  }

  setBin(source) {
      if (!this.#partPolygons.some((polygon) => polygon.source === source)) {
        return false;
      }
      this.#binSource = source;
      return true;
  }

  // progressCallback is called when progress is made
  // displayCallback is called when a new placement has been made
  start(progressCallback, displayCallback) {
      if (this.#binSource === null) {
        return false;
      }

      const bin = this.#partPolygons.find((polygon) => polygon.source === this.#binSource);
      const parts = this.#partPolygons.filter(
        (polygon) => polygon.source !== this.#binSource
      );
      if (!bin) {
        return false;
      }

      this.stop();
      this.#progress = 0;
      this.#prepared = null;
      const runId = this.#runId;
      this.#getWorkerPool()
        .request(serializePreparationRequest({ bin, parts, workerConfig: this.#workerConfig }))
        .then(
          (serialized) => {
            if (runId !== this.#runId || !(serialized instanceof Float64Array) || serialized[0] !== 1) {
              return;
            }
            // The complete preparation response belongs to Rust. JavaScript
            // retains it without decoding so any pooled worker can recover
            // normalized geometry; UI hydration remains lazy.
            this.#prepared = serialized;
            this.#workerTimer = setInterval(() => {
              if (runId !== this.#runId) return;
              if (!this.working) {
                this.#launchWorkers(runId, displayCallback);
                this.working = true;
              }

              progressCallback(this.#progress);
            }, 100);
          },
          () => {}
        );
      return true;
  }

  // The algorithm produces placement data only. SVG construction belongs to
  // @svgnest/svg-logic, which combines this polygon context with the source
  // elements owned by the web app.
  getPlacementContext() {
      const parts = this.#partPolygons.filter(
        (polygon) => polygon.source !== this.#binSource
      );
      const prepared = deserializePreparationResult(this.#prepared, parts);
      return prepared && {
        binSource: this.#binSource,
        tree: prepared.tree,
        binBounds: prepared.bounds
      };
  }

  stop() {
      this.#runId += 1;
      this.working = false;
      this.#workerPool?.drain();
      if (this.#workerTimer) {
        clearInterval(this.#workerTimer);
        this.#workerTimer = null;
      }
  }

  /** Permanently releases the reusable worker pool. */
  terminate() {
      this.stop();
      this.#workerPool?.terminate();
      this.#workerPool = null;
  }

  config(nextConfig) {
    if (!nextConfig) return false;

    const packedConfig = packWorkerConfig(nextConfig);
    if (packedConfig === 0) return false;
    this.stop();
    this.#workerConfig = packedConfig;

    this.#best = null;
    this.#nfpCacheState = new Float64Array([0]);
    this.#prepared = null;
    this.#generationState = new Float64Array();

    return true;
  }
}
