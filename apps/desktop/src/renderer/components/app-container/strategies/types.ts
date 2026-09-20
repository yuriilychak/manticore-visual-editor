import type { AssetType } from '../../../../types';

import type { NewContentStrategy } from '../new-content-dialog/types';

export type ContentStrategyResult =
  | {
      action: 'open-new-content';
      assetType: AssetType.Bundle | AssetType.ProjectFolder;
      parentPath: string;
    }
  | {
      action: 'show-notification';
      message: string;
    };

export type WorkingScreenActionStrategy = {
  handle: (action: string, id: number, data?: unknown) => void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
};

export type ContentStrategy = NewContentStrategy &
  WorkingScreenActionStrategy & {
    setParentPath: (parentPath: string) => void;
  };
