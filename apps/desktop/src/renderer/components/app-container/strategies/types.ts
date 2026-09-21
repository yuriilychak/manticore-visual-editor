import type { AssetType } from '../../../../types';

import type { NewContentStrategy } from '../new-content-dialog/types';

export type OpenNewContentResult =
  | {
      action: 'open-new-content';
      assetType: AssetType.Bundle | AssetType.ProjectFolder;
      parentPath: string;
    }
  | {
      action: 'open-new-content';
      assetType: AssetType.BundleFolder | AssetType.TextureAtlas;
      parentId: number;
    };

export type ContentStrategyResult = OpenNewContentResult
  | {
      action: 'show-notification';
      message: string;
    };

export type WorkingScreenActionStrategy = {
  handle: (action: string, id: number, data?: unknown) => void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
};

export type ContentStrategy = NewContentStrategy &
  WorkingScreenActionStrategy & {
    setParentId: (parentId: number) => void;
    setParentPath: (parentPath: string) => void;
  };
