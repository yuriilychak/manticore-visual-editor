import type { ProjectContent } from '@manticore/project/types';
import type { ComponentType } from 'react';

import type { AssetType, ProjectActionHandler } from '../../../types';

import type { ImportAssetResult } from './common';
import type { ProjectProxy } from './ProjectProxy';

export type ModalPropsMap = {
  'delete-content': {
    isOpen: boolean;
    items: readonly ProjectContent[];
    type: 'delete-content';
  };
  'import-asset': {
    bundleId: number;
    errors: readonly ImportAssetResult[];
    isOpen: boolean;
    projectProxy: ProjectProxy;
    type: 'import-asset';
  };
  'new-content': {
    assetType: AssetType;
    isOpen: boolean;
    siblingNames: readonly string[];
    type: 'new-content';
  };
};

export type ModalType = keyof ModalPropsMap;
export type ModalComponent<Type extends ModalType> = ComponentType<{ onAction: ProjectActionHandler; projectPath?: string } & ModalPropsMap[Type]>;
