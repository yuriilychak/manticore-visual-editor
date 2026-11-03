import { AssetType } from './asset-type';

export { AssetType } from './asset-type';

export type ProjectContentType = Exclude<AssetType, AssetType.None>;

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
  type: ProjectContentType;
  version: number;
};

export type ProjectConfig = {
  content: ProjectContent[];
  name: string;
  version: number;
};
