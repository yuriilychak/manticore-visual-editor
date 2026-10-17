import { ProjectItemId } from '../constants';

export class OpenImportAssets {
  readonly #bundleId: number;

  constructor(bundleId = ProjectItemId.Empty) {
    this.#bundleId = bundleId;
  }

  get bundleId() {
    return this.#bundleId;
  }
}
