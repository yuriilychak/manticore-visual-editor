import type { ProjectContent } from '@manticore/project/types';

export type ImportAsset = { data?: Uint8Array; filePath: string };
export type ImportAssetResult = { asset: ProjectContent | null; error: string | null; filePath: string };

export class ImportAssets {
  readonly #assets: ReadonlyArray<ImportAsset>;
  readonly #onProgress: (current: number, total: number) => void;

  constructor(assets: ReadonlyArray<ImportAsset>, onProgress: (current: number, total: number) => void) {
    this.#assets = assets;
    this.#onProgress = onProgress;
  }

  get assets() {
    return this.#assets;
  }

  get onProgress() {
    return this.#onProgress;
  }
}
