import type { ProjectContent } from '@manticore/project/types';

import type { SvgIconComponent } from '@mui/icons-material';

import type { AssetType } from '../../../types';

import type { ShortcutLabels } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo, RestoredProject } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import type { ImportAssetResult } from './common';
import type { NotificationError } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { ProjectProxy } from './ProjectProxy';
import type { ContentStrategy, OpenNewContentData } from './strategies';

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
  bundleIds: readonly number[];
  contentById: ReadonlyMap<number, ProjectContent>;
  contentStrategies: ReadonlyMap<AssetType, ContentStrategy>;
  disabledItemIds: readonly MenubarItemId[];
  expandedItemIds: readonly number[];
  modalData: ModalPropsMap;
  notificationError: NotificationError;
  projectProxy: ProjectProxy;
  selectionAnchor: number | null;
  selection: readonly number[];
};

export type WorkingScreenActionPayload = { assetType: AssetType; data?: unknown; id: number };

type SelectionPayload = Omit<WorkingScreenActionPayload, 'data'> & {
  data: { id: number; isExtended: boolean; isRange: boolean };
};

type PayloadAction<TType extends string, TPayload> = { payload: TPayload; type: TType };
type EmptyAction<TType extends string> = { type: TType };

export type AppContainerAction =
  | EmptyAction<'create-project' | 'close-delete-modal' | 'close-import-assets-dialog' | 'close-new-content-dialog' | 'selection-cleared'>
  | PayloadAction<'delete-completed', { error?: NotificationError }>
  | PayloadAction<'expanded-item-toggled', number>
  | PayloadAction<'import-assets-completed', readonly ImportAssetResult[]>
  | PayloadAction<'open-delete-modal', WorkingScreenActionPayload>
  | PayloadAction<'open-import-assets', { bundleId: number | null }>
  | PayloadAction<'open-new-content', OpenNewContentData>
  | PayloadAction<'project-changed', ProjectInfo>
  | PayloadAction<'restore-project-completed', RestoredProject>
  | PayloadAction<'select', SelectionPayload>
  | PayloadAction<'show-notification', { error: NotificationError }>;
