import type { ApplicationAction, WindowControls } from '../../types';

export enum NotificationError {
  None = 0,
  ContentConfiguration,
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

export const NOTIFICATION_LOCALE_KEYS: Readonly<Record<NotificationError, string>> = {
  [NotificationError.None]: '',
  [NotificationError.ContentConfiguration]: 'common.contentConfigurationError',
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

const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

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
