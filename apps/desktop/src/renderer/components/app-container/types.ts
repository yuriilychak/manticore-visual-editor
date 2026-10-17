import type { ProjectContent } from '@manticore/project/types';

import type { SvgIconComponent } from '@mui/icons-material';

import type { AssetType, ReducerAction } from '../../../types';

import type { ShortcutLabels } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo, RestoredProject } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import type { ImportAssetResult } from './common';
import type { NotificationError } from './constants';
import type { ModalPropsMap, ModalType } from './modal-types';
import type { ProjectProxy } from './ProjectProxy';
import type { ContentStrategy, OpenNewContentData } from './strategies';

export type NewContentValues = Record<string, string>;
export type ApplicationActionHandler = (action: ApplicationAction) => void;

export type VisibleProjectItem = {
  depth: number;
  id: number;
};

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

export interface NewContentStrategy {
  contentType: AssetType;
  create: (values: NewContentValues) => Promise<void>;
  fields: readonly NewContentField[];
  validate: (values: NewContentValues) => Promise<NewContentValidation>;
}

export type AppContainerState = {
  activeModalType: ModalType | '';
  contentStrategies: ReadonlyMap<AssetType, ContentStrategy>;
  disabledItemIds: readonly MenubarItemId[];
  expandedItemIds: ReadonlySet<number>;
  modalData: ModalPropsMap;
  notificationError: NotificationError;
  projectProxy: ProjectProxy;
  selectionAnchor: number;
  selection: readonly number[];
  visibleProjectItems: readonly VisibleProjectItem[];
};

export type WorkingScreenActionPayload = { assetType: AssetType; data?: unknown; id: number };

type SelectionPayload = Omit<WorkingScreenActionPayload, 'data'> & {
  data: { id: number; isExtended: boolean; isRange: boolean };
};

type PayloadAction<TType extends string, TPayload> = Required<ReducerAction<TType, TPayload>>;
type EmptyAction<TType extends string> = ReducerAction<TType>;

export type AppContainerAction =
  | EmptyAction<'create-project' | 'close-delete-modal' | 'close-import-assets-dialog' | 'close-new-content-dialog' | 'selection-cleared'>
  | PayloadAction<'delete-completed', { error?: NotificationError }>
  | PayloadAction<'expanded-item-toggled', number>
  | PayloadAction<'import-assets-completed', readonly ImportAssetResult[]>
  | PayloadAction<'open-delete-modal', WorkingScreenActionPayload>
  | PayloadAction<'open-import-assets', { bundleId: number }>
  | PayloadAction<'open-new-content', OpenNewContentData>
  | PayloadAction<'project-changed', ProjectInfo>
  | PayloadAction<'restore-project-completed', RestoredProject>
  | PayloadAction<'select', SelectionPayload>
  | PayloadAction<'show-notification', { error: NotificationError }>;
