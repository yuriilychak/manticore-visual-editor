import { AssetType } from '../../../../../../../types';

export type FileType = AssetType.Image | AssetType.TextureAtlas | AssetType.Font;

export type FileCounts = Record<FileType, number> & {
  hasAnyContent: boolean;
};
