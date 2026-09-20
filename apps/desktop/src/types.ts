import type { ProjectContent } from './project/types';

export enum AssetType {
  Project = 0,
  ProjectFolder = 1,
  Bundle = 2,
  BundleFolder = 3,
  Image = 4,
  TextureAtlas = 5
}

export const ASSET_TYPE_LOCALE_KEY: Record<AssetType, string> = {
  [AssetType.Project]: 'project',
  [AssetType.ProjectFolder]: 'folder',
  [AssetType.Bundle]: 'bundle',
  [AssetType.BundleFolder]: 'bundleFolder',
  [AssetType.Image]: 'image',
  [AssetType.TextureAtlas]: 'textureAtlas'
};

/** A UI projection of project content; it is not persisted. */
export type FolderConfig = { id: number; items: string[]; name: string };

export type ProjectInfo = {
  content?: ProjectContent[];
  folders: FolderConfig[];
  name: string;
  path: string;
  version?: number;
};

export type ProjectActionHandler = (action: string, assetType: AssetType, id: number, data?: unknown) => void | Promise<void>;
