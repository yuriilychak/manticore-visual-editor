import { TITLE_BAR_HEIGHT } from '../../../../../constants';

import type { MenubarMenu, MenubarMenuAnchors } from './types';

export const INITIAL_MENU_ANCHORS: MenubarMenuAnchors = {
  file: null,
  help: null,
  language: null
};

export const MENU_SLOT_PROPS = { list: { disablePadding: true } };

export const MENUS: readonly MenubarMenu[] = [
  {
    anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
    id: 'file',
    isMenubarButton: true,
    items: [
      [
        { id: 'create-file', labelKey: 'menu.file.createFile', type: 'action' },
        { id: 'create-project', labelKey: 'menu.file.createProject', type: 'action' },
        { id: 'create-window', labelKey: 'menu.file.createWindow', type: 'action' }
      ],
      [
        { id: 'import-file', labelKey: 'menu.file.importFile', type: 'action' },
        { id: 'import-project', labelKey: 'menu.file.importProject', type: 'action' }
      ],
      [{ id: 'open-project', labelKey: 'menu.file.openProject', type: 'action' }]
    ],
    labelKey: 'menu.file.label',
    style: 'menu',
    transformOrigin: { horizontal: 'left', vertical: 'top' }
  },
  {
    anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
    id: 'help',
    isMenubarButton: true,
    items: [[{ id: 'language', labelKey: 'menu.help.language', type: 'submenu' }]],
    labelKey: 'menu.help.label',
    style: 'menu',
    transformOrigin: { horizontal: 'left', vertical: 'top' }
  },
  {
    anchorOrigin: { horizontal: 'right', vertical: 'top' },
    id: 'language',
    isMenubarButton: false,
    items: [[
      { id: 'set-language-en', labelKey: 'menu.help.languages.english', type: 'action' },
      { id: 'set-language-es', labelKey: 'menu.help.languages.spanish', type: 'action' }
    ]],
    labelKey: 'menu.help.language',
    style: 'languageMenu',
    transformOrigin: { horizontal: 'left', vertical: 'top' }
  }
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
  divider: { borderColor: 'text.secondary', my: 0 },
  languageMenu: { WebkitAppRegion: 'no-drag' },
  menu: { WebkitAppRegion: 'no-drag' },
  menuItem: {
    '&.Mui-selected': { bgcolor: '#3b9eea3d' },
    '&.Mui-selected:hover': { bgcolor: '#3b9eea52' },
    minHeight: 30,
    py: 0.25,
    ...MENUBAR_TEXT_STYLES
  }
} as const;
