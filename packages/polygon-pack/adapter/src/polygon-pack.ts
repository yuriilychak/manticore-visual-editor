/*!
 * PolygonPack
 * Licensed under the MIT license
 */

import { NestingWorkerPool } from "./workers/nesting-worker-pool";
import {
  deserializeGenerationBegin,
  deserializeGenerationComplete,
  deserializePlacement,
  deserializePreparationResult,
  emptyCacheState,
  packWorkerConfig,
  serializeGenerationBegin,
  serializeGenerationComplete,
  serializePreparationRequest
} from "./worker-protocol";
import type { NestingConfig, PlacementResult, PolygonNode, SourcePolygon } from './types';

type ProgressCallback = (progress: number) => void;
type DisplayCallback = (best: PlacementResult | null) => void;

export class PolygonPack {
  #prepared: Uint8Array | null = null;
  // Legacy empty-cache payload is one zero f64, represented directly as bytes.
  #nfpCacheState: Uint8Array = emptyCacheState();
  #generationState: Uint8Array = new Uint8Array();
  #hasBest = false;
  #bestFitness = Infinity;
  #workerTimer: ReturnType<typeof setInterval> | null = null;
  #workerPool: NestingWorkerPool | null = null;
  #progress = 0;
  #runId = 0;
  working = false;

  async #launchWorkers(runId: number, workerConfig: number, displayCallback: DisplayCallback): Promise<void> {
      if (runId !== this.#runId) return;
      const beginRequest = serializeGenerationBegin({
        workerConfig,
        preparation: this.#prepared,
        state: this.#generationState,
        cacheState: this.#nfpCacheState
      });
      let begun;
      try {
        const response = await this.#workerPool!.request(beginRequest);
        if (!(response instanceof Uint8Array)) return;
        begun = deserializeGenerationBegin(response);
      } catch (err) {
        if (runId === this.#runId) console.warn(err);
        return;
      }
      if (runId !== this.#runId) return;
      if (!begun) {
        this.working = false;
        return;
      }
      try {
        const generatedNfp = await this.#workerPool!.requestAll(
          begun.jobs,
          (completed, total) => {
            if (runId === this.#runId) this.#progress = completed / total;
          }
        );
        if (runId !== this.#runId) return;
        if (begun.jobs.length === 0) this.#progress = 1;
        const completeRequest = serializeGenerationComplete({
          workerConfig,
          preparation: this.#prepared,
          continuation: begun.continuation,
          results: generatedNfp
        });
        const response = await this.#workerPool!.request(completeRequest);
        if (!(response instanceof Uint8Array)) return;
        const result = deserializeGenerationComplete(response);
        if (runId !== this.#runId) return;
        if (!result) {
          this.working = false;
          return;
        }
        this.#generationState = result.state;
        this.#nfpCacheState = result.cacheState;
        if (!this.#hasBest || result.fitness < this.#bestFitness) {
          this.#hasBest = true;
          this.#bestFitness = result.fitness;
          displayCallback(deserializePlacement(result.placement, result.partCount));
        } else {
          displayCallback(null);
        }
      } catch (err) {
        if (runId === this.#runId) console.warn(err);
      }
      if (runId === this.#runId) this.working = false;
  }

  // progressCallback is called when progress is made
  // displayCallback is called when a new placement has been made
  start(config: NestingConfig, polygons: SourcePolygon[], binSource: number, progressCallback: ProgressCallback, displayCallback: DisplayCallback): boolean {
      const workerConfig = packWorkerConfig(config);
      if (workerConfig === 0) {
        return false;
      }

      const bin = polygons?.find((polygon) => polygon.source === binSource);
      const parts = polygons?.filter(
        (polygon) => polygon.source !== binSource
      );
      if (!bin || !parts) {
        return false;
      }

      this.stop();
      this.#ensureWorkerPool();
      this.#progress = 0;
      this.#prepared = null;
      this.#hasBest = false;
      this.#bestFitness = Infinity;
      this.#nfpCacheState = emptyCacheState();
      this.#generationState = new Uint8Array();
      const runId = this.#runId;
      this.#workerPool!
        .request(serializePreparationRequest({ bin, parts, workerConfig }))
        .then(
          (serialized) => {
            if (runId !== this.#runId || !(serialized instanceof Uint8Array)) {
              return;
            }
            // The complete preparation response belongs to Rust. JavaScript
            // retains it without decoding so any pooled worker can recover
            // normalized geometry; UI hydration remains lazy.
            this.#prepared = serialized;
            this.#workerTimer = setInterval(() => {
              if (runId !== this.#runId) return;
              if (!this.working) {
                this.#launchWorkers(runId, workerConfig, displayCallback);
                this.working = true;
              }

              progressCallback(this.#progress);
            }, 100);
          },
          (err) => {
            if (runId === this.#runId) console.warn(err);
          }
        );
      return true;
  }

  // The algorithm produces placement data only. SVG construction belongs to
  // @svgnest/svg-logic, which combines this polygon context with the source
  // elements owned by the web app.
  get placementContext(): { tree: PolygonNode[]; binBounds: { x: number; y: number; width: number; height: number } } | null {
      const prepared = deserializePreparationResult(this.#prepared);
      return prepared && {
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

  terminate() {
      this.stop();
      this.#workerPool?.terminate();
      this.#workerPool = null;
  }

  #ensureWorkerPool() {
      if (!this.#workerPool) {
          this.#workerPool = new NestingWorkerPool(
              new URL('./workers/nesting.worker.ts', import.meta.url).href
          );
      }
      return this.#workerPool;
  }

}
