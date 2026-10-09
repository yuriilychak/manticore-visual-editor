import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteRounded from '@mui/icons-material/DeleteRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import type { SxProps, Theme } from '@mui/material';

import type { ActionButtonConfig } from './types';

export const RENAMEABLE_ITEM_LOCALE_KEYS = {
  renameNameLabel: 'common.renameName'
} as const;

const DELETE_SHORTCUT = { darwin: 'Delete', linux: 'Delete', win32: 'Delete' } as const;

export const RENAMEABLE_ITEM_ACTIONS: Record<'delete' | 'editing' | 'viewContent' | 'viewProject' | 'empty', ActionButtonConfig[]> = {
  delete: [{ action: 'open-delete-modal', tooltipLocale: 'common.delete', Icon: DeleteRounded }],
  editing: [
    { action: 'save', tooltipLocale: 'common.saveRename', Icon: CheckRounded },
    { action: 'cancel', tooltipLocale: 'common.cancelRename', Icon: CloseRounded }
  ],
  viewProject: [{ action: 'rename', tooltipLocale: 'common.rename', Icon: EditRounded }],
  viewContent: [
    { action: 'rename', tooltipLocale: 'common.rename', Icon: EditRounded },
    { action: 'open-delete-modal', shortcut: DELETE_SHORTCUT, tooltipLocale: 'common.delete', Icon: DeleteRounded }
  ],
  empty: []
};

export const ITEM_GAP = 0.5;
export const ITEM_HEIGHT = 24;
export const ITEM_ICON_SIZE = 18;
export const ITEM_ACTION_BUTTON_SIZE = ITEM_HEIGHT;

export const RENAMEABLE_ITEM_STYLES: Record<'divider' | 'editingNameInput' | 'name', SxProps<Theme>> = {
  divider: { borderBottomWidth: 2, my: 0 },
  editingNameInput: {
    '&, &:hover': { backgroundColor: 'transparent' },
    flexGrow: 1,
    paddingRight: 0,
    '& .MuiFilledInput-input': { fontSize: '0.875rem', lineHeight: '20px', padding: 0 }
  },
  name: {
    flexGrow: 1,
    fontSize: '0.875rem',
    lineHeight: '20px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
};
