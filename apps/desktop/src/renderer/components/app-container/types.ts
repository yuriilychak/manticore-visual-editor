import type { ProjectContent } from '@manticore/project/types';

import type { SvgIconComponent } from '@mui/icons-material';

import type { AssetType, ReducerAction } from '../../../types';

import type { ShortcutLabels } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo, RestoredProject } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import type { ImportAssetResult } from './common';
import type { ContentAction } from './common';
import type { NotificationError } from './constants';
import type { ModalPropsMap, ModalType } from './modal-types';
import type { OpenNewContentData } from './strategies';

export type NewContentValues = Record<string, string>;
export type NewContentContext = Record<string, unknown>;
export type ApplicationActionHandler = (action: ApplicationAction) => void;
export type CreateContentResult = ContentAction<'content-created', ProjectContent> | ContentAction<'project-opened', ProjectInfo>;

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
  create: (values: NewContentValues, projectPath: string, context: NewContentContext) => Promise<CreateContentResult | void>;
  fields: readonly NewContentField[];
  validate: (values: NewContentValues, siblingNames: readonly string[]) => Promise<NewContentValidation>;
}

export type AppContainerState = {
  activeModalType: ModalType | '';
  bundleIds: readonly number[];
  childrenIdsByParentId: Readonly<Record<number, readonly number[]>>;
  contentById: Readonly<Record<number, ProjectContent>>;
  disabledItemIds: readonly MenubarItemId[];
  expandedItemIds: ReadonlySet<number>;
  modalData: ModalPropsMap;
  notificationError: NotificationError;
  projectName: string;
  projectPath: string;
  selectionAnchor: number;
  selection: readonly number[];
  visibleProjectItems: readonly VisibleProjectItem[];
};

export type WorkingScreenActionPayload = { assetType: AssetType; data?: unknown; id: number };

type PayloadAction<TType extends string, TPayload> = Required<ReducerAction<TType, TPayload>>;
type EmptyAction<TType extends string> = ReducerAction<TType>;

export type AppContainerAction =
  | EmptyAction<'create-project'>
  | PayloadAction<
    | 'content-created'
    | 'project-opened'
    | 'select'
    | 'selection-cleared'
    | 'open-delete-modal'
    | 'close-modal'
    | 'expanded-item-toggled',
    WorkingScreenActionPayload
  >
  | PayloadAction<'content-updated', ProjectContent>
  | PayloadAction<'delete-completed', { deletedIds?: readonly number[]; error?: NotificationError }>
  | PayloadAction<'import-assets-completed', readonly ImportAssetResult[]>
  | PayloadAction<'open-import-assets', { bundleId: number }>
  | PayloadAction<'open-new-content', OpenNewContentData>
  | PayloadAction<'project-renamed', string>
  | PayloadAction<'restore-project-completed', RestoredProject>
  | PayloadAction<'show-notification', { error: NotificationError }>;
