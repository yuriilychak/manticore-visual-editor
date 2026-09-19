import type { ApplicationAction, WindowControls } from '../../types';

export const SELECTED_ACTION_IDS_BY_LANGUAGE: Readonly<Record<string, readonly ApplicationAction[]>> = {
  en: ['set-language-en'],
  es: ['set-language-es']
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
