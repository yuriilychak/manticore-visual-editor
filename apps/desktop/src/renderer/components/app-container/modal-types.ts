import type { ProjectContent } from '@manticore/project/types';
import type { FC } from 'react';

import type { AssetType, ProjectActionHandler } from '../../../types';

import type { ImportAssetResult } from './common';
import type { ContentStrategy } from './strategies';

export type ModalPropsMap = {
  'delete-content': {
    assetType: AssetType;
    id: number;
    isOpen: boolean;
    name: string;
    type: 'delete-content';
  };
  'import-asset': {
    bundleId: number;
    bundles: readonly ProjectContent[];
    errors: readonly ImportAssetResult[];
    isOpen: boolean;
    type: 'import-asset';
  };
  'new-content': {
    isOpen: boolean;
    strategy: ContentStrategy;
    type: 'new-content';
  };
};

export type ModalType = keyof ModalPropsMap;
export type ModalComponent<Type extends ModalType> = FC<{ onAction: ProjectActionHandler } & ModalPropsMap[Type]>;
