import { AssetType } from '../../../../types';

import { BundleFolderStrategy } from './BundleFolderStrategy';
import { BundleStrategy } from './BundleStrategy';
import { ImageStrategy } from './ImageStrategy';
import { ProjectFolderStrategy } from './ProjectFolderStrategy';
import { ProjectStrategy } from './ProjectStrategy';
import { TextureAtlasStrategy } from './TextureAtlasStrategy';
import type { ContentStrategy } from './types';

export const CONTENT_STRATEGIES: ReadonlyMap<AssetType, ContentStrategy> = new Map<AssetType, ContentStrategy>([
  [AssetType.Bundle, new BundleStrategy()],
  [AssetType.BundleFolder, new BundleFolderStrategy()],
  [AssetType.Image, new ImageStrategy()],
  [AssetType.Project, new ProjectStrategy()],
  [AssetType.ProjectFolder, new ProjectFolderStrategy()],
  [AssetType.TextureAtlas, new TextureAtlasStrategy()]
]);

export type { ContentStrategy, ContentStrategyResult, OpenNewContentData, OpenNewContentResult } from './types';
