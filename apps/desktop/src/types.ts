import { AssetType } from '@manticore/project/types';
import type { FolderConfig, ProjectInfo } from '@manticore/project/types';

export { AssetType };
export type { FolderConfig, ProjectInfo };

export const ASSET_TYPE_LOCALE_KEY: Record<AssetType, string> = {
  [AssetType.Project]: 'project',
  [AssetType.ProjectFolder]: 'folder',
  [AssetType.Bundle]: 'bundle',
  [AssetType.BundleFolder]: 'bundleFolder',
  [AssetType.Font]: 'font',
  [AssetType.Image]: 'image',
  [AssetType.TextureAtlas]: 'textureAtlas'
};

export type ProjectActionHandler = (action: string, assetType: AssetType, id: number, data?: unknown) => void | Promise<void>;
