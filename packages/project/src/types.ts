import { AssetType } from './asset-type';

export { AssetType } from './asset-type';

export type FolderConfig = { id: number; items: string[]; name: string };

export type ProjectInfo = {
  content?: ProjectContent[];
  folders: FolderConfig[];
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
  type: AssetType;
  version: number;
};

export type ProjectConfig = {
  content: ProjectContent[];
  name: string;
  version: number;
};
