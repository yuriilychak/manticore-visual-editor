import type { SvgIconComponent } from '@mui/icons-material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';

import { AssetType } from '../../../types';

import { ADD_FOLDER_SHORTCUT } from '../../keyboard-shortcuts';
import type { ApplicationAction, WindowControls } from '../../types';

import { AtlasAddIcon, AtlasIcon, BundleAddIcon, BundleIcon, ImportIcon } from '../custom-icons';

import type { DeleteContentDialogData } from './dialogs/delete-content-dialog';
import type { ImportAssetsDialogData } from './dialogs/import-assets-dialog';
import { notifyUnavailableDesktopApi } from './helpers';
import type { ModalType } from './modal-types';
import { type ActionButtonConfig, ProjectContentDragType } from './types';

export enum NotificationError {
  None = 0,
  ContentConfiguration,
  DeleteContent,
  ContentTypeUnavailable,
  ImportAssets,
  MoveBundle,
  MoveFolder,
  OpenProject,
  RenameBundle,
  RenameBundleFolder,
  RenameFolder,
  RenameProject,
  RenameTextureAtlas,
  RestoreProject
}

export const SELECTED_ACTION_IDS_BY_LANGUAGE: Readonly<Record<string, readonly ApplicationAction[]>> = {
  en: ['set-language-en'],
  es: ['set-language-es']
};

export const WORKING_SCREEN_REDUCER_ACTIONS: readonly string[] = [
  'select',
  'selection-cleared',
  'open-delete-modal',
  'close-delete-modal',
  'close-new-content-dialog',
  'close-import-assets-dialog'
];

export const DEFAULT_DELETE_CONTENT: DeleteContentDialogData = {
  isOpen: false,
  items: [],
  type: 'delete-content'
};

export const DEFAULT_IMPORT_ASSETS_DIALOG: ImportAssetsDialogData = {
  bundleId: 0,
  bundles: [],
  errors: [],
  isOpen: false,
  type: 'import-asset'
};

export const LAST_INDEX = -1;
export const MODAL_TYPES: readonly ModalType[] = ['new-content', 'import-asset', 'delete-content'];

type ProjectItemConfig = {
  actions?: ActionButtonConfig[];
  dragType?: string;
  dropTargets?: Record<string, AssetType>;
  expandable?: boolean;
  icon: SvgIconComponent;
};

const ADD_CONTENT_ACTIONS: ActionButtonConfig[] = [
  {
    action: 'add-folder',
    shortcut: ADD_FOLDER_SHORTCUT,
    tooltipLocale: 'folder.add',
    Icon: CreateNewFolderIcon
  },
  { action: 'add-bundle', tooltipLocale: 'bundle.add', Icon: BundleAddIcon }
];

const ROOT_CONTENT_ACTIONS: ActionButtonConfig[] = [
  ...ADD_CONTENT_ACTIONS,
  { action: 'import', tooltipLocale: 'common.import', Icon: ImportIcon }
];

const BUNDLE_CONTENT_ACTIONS: ActionButtonConfig[] = [
  {
    action: 'add-folder',
    shortcut: ADD_FOLDER_SHORTCUT,
    tooltipLocale: 'bundleFolder.add',
    Icon: CreateNewFolderIcon
  },
  { action: 'add-atlas', tooltipLocale: 'textureAtlas.add', Icon: AtlasAddIcon },
  { action: 'import', tooltipLocale: 'common.import', Icon: ImportIcon }
];

const BUNDLE_FOLDER_CONTENT_ACTIONS: ActionButtonConfig[] = [
  {
    action: 'add-folder',
    shortcut: ADD_FOLDER_SHORTCUT,
    tooltipLocale: 'bundleFolder.add',
    Icon: CreateNewFolderIcon
  },
  { action: 'add-atlas', tooltipLocale: 'textureAtlas.add', Icon: AtlasAddIcon }
];

const FOLDER_AND_BUNDLE_DROP_TARGETS = {
  [ProjectContentDragType.ProjectFolder]: AssetType.ProjectFolder,
  [ProjectContentDragType.ProjectBundle]: AssetType.Bundle
};

const BUNDLE_CONTENT_DROP_TARGETS = {
  [ProjectContentDragType.BundleFolder]: AssetType.BundleFolder,
  [ProjectContentDragType.Image]: AssetType.Image,
  [ProjectContentDragType.ProjectBundle]: AssetType.Bundle,
  [ProjectContentDragType.TextureAtlas]: AssetType.TextureAtlas
};

const ATLAS_DROP_TARGETS = {
  [ProjectContentDragType.Image]: AssetType.Image
};

export const PROJECT_ITEM_CONFIG: Record<AssetType, ProjectItemConfig> = {
  [AssetType.Project]: {
    actions: ROOT_CONTENT_ACTIONS,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    icon: WorkIcon
  },
  [AssetType.ProjectFolder]: {
    actions: ADD_CONTENT_ACTIONS,
    dragType: ProjectContentDragType.ProjectFolder,
    dropTargets: FOLDER_AND_BUNDLE_DROP_TARGETS,
    expandable: true,
    icon: FolderIcon
  },
  [AssetType.Bundle]: {
    actions: BUNDLE_CONTENT_ACTIONS,
    dragType: ProjectContentDragType.ProjectBundle,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandable: true,
    icon: BundleIcon
  },
  [AssetType.BundleFolder]: {
    actions: BUNDLE_FOLDER_CONTENT_ACTIONS,
    dragType: ProjectContentDragType.BundleFolder,
    dropTargets: BUNDLE_CONTENT_DROP_TARGETS,
    expandable: true,
    icon: FolderIcon
  },
  [AssetType.Font]: { icon: FontDownloadIcon },
  [AssetType.Image]: { dragType: ProjectContentDragType.Image, icon: ImageIcon },
  [AssetType.TextureAtlas]: {
    dragType: ProjectContentDragType.TextureAtlas,
    dropTargets: ATLAS_DROP_TARGETS,
    expandable: true,
    icon: AtlasIcon
  }
};

export const NOTIFICATION_LOCALE_KEYS: Readonly<Record<NotificationError, string>> = {
  [NotificationError.None]: '',
  [NotificationError.ContentConfiguration]: 'common.contentConfigurationError',
  [NotificationError.DeleteContent]: 'common.deleteContentError',
  [NotificationError.ContentTypeUnavailable]: 'common.contentTypeUnavailable',
  [NotificationError.ImportAssets]: 'common.importAssetsError',
  [NotificationError.MoveBundle]: 'common.moveBundleError',
  [NotificationError.MoveFolder]: 'common.moveFolderError',
  [NotificationError.OpenProject]: 'common.openProjectError',
  [NotificationError.RenameBundle]: 'common.renameBundleError',
  [NotificationError.RenameBundleFolder]: 'common.renameBundleFolderError',
  [NotificationError.RenameFolder]: 'common.renameFolderError',
  [NotificationError.RenameProject]: 'common.renameProjectError',
  [NotificationError.RenameTextureAtlas]: 'common.renameTextureAtlasError',
  [NotificationError.RestoreProject]: 'common.restoreProjectError'
};

export const UNAVAILABLE_WINDOW_CONTROLS: WindowControls = {
  close: async () => notifyUnavailableDesktopApi(),
  isMaximized: async () => false,
  minimize: async () => notifyUnavailableDesktopApi(),
  onMaximizeChange: () => () => undefined,
  toggleMaximize: async () => {
    notifyUnavailableDesktopApi();
    return false;
  }
};

export const WINDOW_CONTROLS = new Proxy<WindowControls>(UNAVAILABLE_WINDOW_CONTROLS, {
  get: (_target, property) =>
    Reflect.get(window.manticore?.windowControls ?? UNAVAILABLE_WINDOW_CONTROLS, property) ??
    Reflect.get(UNAVAILABLE_WINDOW_CONTROLS, property)
});
