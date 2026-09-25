export class OpenImportAssets {
  readonly #bundleId: number | null;

  constructor(bundleId: number | null = null) {
    this.#bundleId = bundleId;
  }

  get bundleId() {
    return this.#bundleId;
  }
}
