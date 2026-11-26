import { ATLAS_PADDING } from 'atlas-packer';
import { TextureAtlasClusterWorkerPool, type ColorMarginCluster } from './worker_pool';

export type TextureAtlasSprite = { height: number; scaleFix: boolean; width: number; x: number; y: number };

export type TextureAtlasClusterizerOptions = {
  numWorkers?: number;
  wasmBinary?: ArrayBuffer;
  wasmUrl?: string | URL;
  workerSource: string | URL | (() => Worker);
};

/** WASM-backed color-margin processor for texture atlas sprite clusters. */
export class TextureAtlasClusterizer {
  private constructor(private readonly pool: TextureAtlasClusterWorkerPool) {}

  static async create({ numWorkers, wasmBinary, wasmUrl, workerSource }: TextureAtlasClusterizerOptions): Promise<TextureAtlasClusterizer> {
    if ((wasmBinary == null) === (wasmUrl == null)) throw new Error('TextureAtlasClusterizer.create requires exactly one of wasmBinary or wasmUrl.');
    const binary = wasmBinary ?? await (await fetch(wasmUrl as RequestInfo)).arrayBuffer();
    const availableWorkers = typeof navigator === 'undefined' ? 4 : navigator.hardwareConcurrency || 4;
    const pool = await TextureAtlasClusterWorkerPool.create({ numWorkers: Math.max(1, numWorkers ?? availableWorkers), wasmBinary: binary, workerSource });
    return new TextureAtlasClusterizer(pool);
  }

  /** Updates independent sprite clusters in parallel, then joins all results into the atlas. */
  async applyColorMargins(pixels: Uint8ClampedArray, atlasWidth: number, sprites: readonly TextureAtlasSprite[]): Promise<void> {
    const prepared = sprites.map(sprite => this.extractCluster(pixels, atlasWidth, sprite));
    const updated = await this.pool.process(prepared.map(({ cluster }) => cluster));
    prepared.forEach(({ height, left, top, width }, index) => {
      const cluster = updated[index];
      for (let row = 0; row < height; ++row) {
        const targetOffset = ((top + row) * atlasWidth + left) * 4;
        pixels.set(cluster.subarray(row * width * 4, (row + 1) * width * 4), targetOffset);
      }
    });
  }

  terminate(): void { this.pool.terminate(); }

  private extractCluster(pixels: Uint8ClampedArray, atlasWidth: number, { height, scaleFix, width, x, y }: TextureAtlasSprite): { cluster: ColorMarginCluster; height: number; left: number; top: number; width: number } {
    const clusterWidth = width + ATLAS_PADDING * 2, clusterHeight = height + ATLAS_PADDING * 2;
    const data = new Uint8Array(clusterWidth * clusterHeight * 4);
    const left = x - ATLAS_PADDING, top = y - ATLAS_PADDING;
    for (let row = 0; row < clusterHeight; ++row) {
      const sourceOffset = ((top + row) * atlasWidth + left) * 4;
      data.set(pixels.subarray(sourceOffset, sourceOffset + clusterWidth * 4), row * clusterWidth * 4);
    }
    return { cluster: { data, height: clusterHeight, padding: ATLAS_PADDING, scaleFix, width: clusterWidth }, height: clusterHeight, left, top, width: clusterWidth };
  }
}

/** Creates a clusterizer using the algorithm package's shared build artifact. */
export const createTextureAtlasClusterizer = () => TextureAtlasClusterizer.create({
  wasmUrl: new URL('../../../../lib/texture-atlas-clusterizer.wasm', import.meta.url),
  workerSource: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
});
