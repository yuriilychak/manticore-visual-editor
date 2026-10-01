import type { AssetType } from '../../../../types';

import { ContentAction, type ImportAssetResult, OpenImportAssets, OpenNewContent } from '../common';
import type { NotificationError } from '../constants';
import type { ProjectProxy } from '../ProjectProxy';
import type { NewContentStrategy } from '../types';


export type OpenNewContentData =
  | OpenNewContent<AssetType.Bundle | AssetType.BundleFolder | AssetType.ProjectFolder | AssetType.TextureAtlas, { parentId: number }>;

export type OpenNewContentResult = ContentAction<'open-new-content', OpenNewContentData>;
export type OpenImportAssetsResult = ContentAction<'open-import-assets', OpenImportAssets>;
export type ImportAssetsCompletedResult = ContentAction<'import-assets-completed', readonly ImportAssetResult[]>;
export type DeleteCompletedResult = ContentAction<'delete-completed', { error?: NotificationError }>;

export type ContentStrategyResult = DeleteCompletedResult | ImportAssetsCompletedResult | OpenImportAssetsResult | OpenNewContentResult | ContentAction<'show-notification', { error: NotificationError }>;

export interface WorkingScreenActionStrategy {
  handle: (contentAction: ContentAction) => void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
}

export interface ContentStrategy extends NewContentStrategy, WorkingScreenActionStrategy {
  setField: (key: string, value: unknown) => void;
  setFields: (fields: Record<string, unknown>) => void;
}

export type ContentStrategyConstructor = new (projectProxy: ProjectProxy) => ContentStrategy;
export type ContentStrategyAssetType = AssetType.Bundle | AssetType.BundleFolder | AssetType.Image | AssetType.Project | AssetType.ProjectFolder | AssetType.TextureAtlas;
export type ContentStrategyConfig = readonly (readonly [ContentStrategyAssetType, ContentStrategyConstructor])[];
