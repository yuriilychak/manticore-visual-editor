import { AssetType } from '../../../../types';

import { BundleFolderStrategy } from './BundleFolderStrategy';
import { BundleStrategy } from './BundleStrategy';
import { ProjectFolderStrategy } from './ProjectFolderStrategy';
import { ProjectStrategy } from './ProjectStrategy';
import { TextureAtlasStrategy } from './TextureAtlasStrategy';
import type { ContentStrategyConfig } from './types';

export const CONTENT_STRATEGY_CONSTRUCTORS: ContentStrategyConfig = [
  [AssetType.Bundle, BundleStrategy],
  [AssetType.BundleFolder, BundleFolderStrategy],
  [AssetType.Project, ProjectStrategy],
  [AssetType.ProjectFolder, ProjectFolderStrategy],
  [AssetType.TextureAtlas, TextureAtlasStrategy]
];
