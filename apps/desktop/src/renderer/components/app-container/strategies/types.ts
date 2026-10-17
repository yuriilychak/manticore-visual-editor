import type { ProjectContent } from '@manticore/project/types';

import type { AssetType } from '../../../../types';
import type { ProjectInfo } from '../../../types';

import { ContentAction, type ImportAssetResult, OpenImportAssets, OpenNewContent } from '../common';
import type { NotificationError } from '../constants';
import type { NewContentStrategy } from '../types';


export type OpenNewContentData =
  | OpenNewContent<AssetType.Bundle | AssetType.BundleFolder | AssetType.ProjectFolder | AssetType.TextureAtlas, { parentId: number }>;

export type OpenNewContentResult = ContentAction<'open-new-content', OpenNewContentData>;
export type OpenImportAssetsResult = ContentAction<'open-import-assets', OpenImportAssets>;
export type ImportAssetsCompletedResult = ContentAction<'import-assets-completed', readonly ImportAssetResult[]>;
export type DeleteCompletedResult = ContentAction<'delete-completed', { error?: NotificationError; project?: ProjectInfo }>;
export type ContentUpdatedResult = ContentAction<'content-updated', ProjectContent>;
export type ProjectRenamedResult = ContentAction<'project-renamed', string>;

export type ContentStrategyResult = ContentUpdatedResult | DeleteCompletedResult | ImportAssetsCompletedResult | OpenImportAssetsResult | OpenNewContentResult | ProjectRenamedResult | ContentAction<'show-notification', { error: NotificationError }>;

export interface WorkingScreenActionStrategy {
  handle: (contentAction: ContentAction, projectPath: string) => void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
}

export interface ContentStrategy extends NewContentStrategy, WorkingScreenActionStrategy {
  setField: (key: string, value: unknown) => void;
  setFields: (fields: Record<string, unknown>) => void;
}

export type ContentStrategyAssetType = AssetType.Bundle | AssetType.BundleFolder | AssetType.Image | AssetType.Project | AssetType.ProjectFolder | AssetType.TextureAtlas;
