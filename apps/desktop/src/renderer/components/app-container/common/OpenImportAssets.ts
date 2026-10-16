import { NO_BUNDLE_ID } from '../constants';

export class OpenImportAssets {
  readonly #bundleId: number;

  constructor(bundleId = NO_BUNDLE_ID) {
    this.#bundleId = bundleId;
  }

  get bundleId() {
    return this.#bundleId;
  }
}
