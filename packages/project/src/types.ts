import { AssetType } from './asset-type';

export { AssetType } from './asset-type';

export type ProjectContentType = Exclude<AssetType, AssetType.None>;

/** A polygon placement: local coordinates are relative to its source sprite, x/y are atlas coordinates. */
export type ProjectTextureAtlasQuadItem = {
  id: number;
  localX?: number;
  localY?: number;
  polygonIndex?: number;
  rotated: boolean;
  rotation?: number;
  x: number;
  y: number;
};
export type ProjectTextureAtlasQuad = { height: number; items: ProjectTextureAtlasQuadItem[]; outdated: boolean; width: number };
export type ProjectTextureAtlasFiles = { dxt5: ArrayBuffer; dxt5Preview: ArrayBuffer; etc2: ArrayBuffer; etc2Preview: ArrayBuffer; png: ArrayBuffer };

export type ProjectInfo = {
  content?: ProjectContent[];
  name: string;
  path: string;
  version?: number;
};

export type ProjectContent = {
  /** Present only in legacy manifests; asset data now lives beside its source. */
  data?: null;
  id: number;
  name: string;
  parentId: number;
  quad?: ProjectTextureAtlasQuad;
  type: ProjectContentType;
  version: number;
};

export type ProjectConfig = {
  content: ProjectContent[];
  name: string;
  version: number;
};
