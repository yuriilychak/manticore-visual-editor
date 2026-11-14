import { AssetType } from './asset-type';

export { AssetType } from './asset-type';

export type ProjectContentType = Exclude<AssetType, AssetType.None>;

export type ProjectTextureAtlasQuadItem = { id: number; rotated: boolean; x: number; y: number };
export type ProjectTextureAtlasQuad = { height: number; items: ProjectTextureAtlasQuadItem[]; outdated: boolean; width: number };

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
