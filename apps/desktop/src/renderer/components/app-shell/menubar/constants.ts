import { TITLE_BAR_HEIGHT } from '../../../constants';

import type { FileMenuItem, LanguageMenuItem } from './types';

export const FILE_MENU_ITEMS: readonly FileMenuItem[] = [
  { labelKey: 'menu.file.createFile' },
  { labelKey: 'menu.file.importFile' },
  { labelKey: 'menu.file.createProject' }
];

export const LANGUAGE_MENU_ITEMS: readonly LanguageMenuItem[] = [
  { code: 'en', labelKey: 'menu.help.languages.english' },
  { code: 'es', labelKey: 'menu.help.languages.spanish' }
];

const MENUBAR_TEXT_STYLES = {
  fontSize: '0.875rem',
  fontWeight: 500,
  letterSpacing: '0.02857em',
  lineHeight: 1.75,
  textTransform: 'none'
} as const;

export const MENUBAR_STYLES = {
  button: {
    WebkitAppRegion: 'no-drag',
    color: 'common.white',
    height: TITLE_BAR_HEIGHT,
    minWidth: 0,
    px: 1,
    ...MENUBAR_TEXT_STYLES
  },
  languageMenu: { WebkitAppRegion: 'no-drag' },
  menu: { WebkitAppRegion: 'no-drag' },
  menuItem: { minHeight: TITLE_BAR_HEIGHT, ...MENUBAR_TEXT_STYLES }
} as const;
