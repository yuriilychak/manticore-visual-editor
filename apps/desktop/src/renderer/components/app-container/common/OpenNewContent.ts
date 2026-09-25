import type { AssetType } from '../../../../types';

export class OpenNewContent<TAssetType extends AssetType = AssetType, TFields extends Record<string, unknown> = Record<string, unknown>> {
  readonly #assetType: TAssetType;
  readonly #fields: TFields;

  constructor(assetType: TAssetType, fields: TFields) {
    this.#assetType = assetType;
    this.#fields = fields;
  }

  get assetType() {
    return this.#assetType;
  }

  get fields() {
    return this.#fields;
  }
}
