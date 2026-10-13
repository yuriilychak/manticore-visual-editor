import type { SvgIconComponent } from '@mui/icons-material';
import type { ProjectContent } from '@manticore/project/types';

import type { AssetType } from '../../../types';

import type { ShortcutLabels } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import type { NotificationError } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { ProjectProxy } from './ProjectProxy';
import type { ContentStrategy } from './strategies';

export type NewContentValues = Record<string, string>;
export type ApplicationActionHandler = (action: ApplicationAction) => void;

export enum ProjectContentDragType {
  ProjectFolder = 'application/x-manticore-project-folder',
  ProjectBundle = 'application/x-manticore-project-bundle',
  BundleFolder = 'application/x-manticore-bundle-folder',
  TextureAtlas = 'application/x-manticore-texture-atlas',
  Image = 'application/x-manticore-image'
}

export interface NewContentValidation {
  readonly fieldKey: string;
  readonly isValid: boolean;
  readonly reason: string;
}

export type NewContentField = {
  key: string;
  selectValue?: () => Promise<string>;
};

export type ActionButtonConfig = {
  action: string;
  tooltipLocale: string;
  Icon: SvgIconComponent;
  shortcut?: ShortcutLabels;
};

export type ProjectTreeNode = {
  children: ProjectTreeNode[];
  item: ProjectContent;
};

export type VisibleProjectTreeItem = {
  depth: number;
  node: ProjectTreeNode;
};

export interface NewContentStrategy {
  contentType: AssetType;
  create: (values: NewContentValues) => Promise<void>;
  fields: readonly NewContentField[];
  validate: (values: NewContentValues) => Promise<NewContentValidation>;
}

export type AppContainerState = {
  bundles: ModalPropsMap['import-asset']['bundles'];
  contentById: ReadonlyMap<number, ProjectContent>;
  contentStrategies: ReadonlyMap<AssetType, ContentStrategy>;
  disabledItemIds: readonly MenubarItemId[];
  expandedItemIds: readonly number[];
  modalData: ModalPropsMap;
  notificationError: NotificationError;
  project: ProjectInfo | null;
  projectProxy: ProjectProxy;
  selectionAnchor: number | null;
  selection: readonly number[];
};

export type AppContainerAction = { type: string; payload?: unknown };
export type ReducerActionHandler = (prevState: AppContainerState, payload?: unknown) => AppContainerState;
export type WorkingScreenActionPayload = { assetType: AssetType; data?: unknown; id: number };
