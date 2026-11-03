import { AssetType } from '../../../../../../../types';

import type { FileCounts, FileType } from './types';

export const FILE_TYPES: readonly FileType[] = [AssetType.Image, AssetType.TextureAtlas, AssetType.Font];

export const FILE_TYPE_SET = new Set<FileType>(FILE_TYPES);

export const INITIAL_COUNTS: FileCounts = {
  [AssetType.Image]: 0,
  [AssetType.TextureAtlas]: 0,
  [AssetType.Font]: 0,
  hasAnyContent: false
};

export const EMPTY_LOCALE_KEY_BY_TYPE: Partial<Record<AssetType, string>> = {
  [AssetType.Bundle]: 'details.bundleEmpty',
  [AssetType.BundleFolder]: 'details.folderEmpty',
  [AssetType.ProjectFolder]: 'details.folderEmpty'
};
