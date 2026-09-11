import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import type { SxProps, Theme } from '@mui/material';

import type { ActionButtonConfig } from './types';

export const RENAMEABLE_ITEM_LOCALE_KEYS = {
  renameNameLabel: 'common.renameName'
} as const;

export const RENAMEABLE_ITEM_ACTIONS: Record<'editing' | 'viewProject' | 'empty', ActionButtonConfig[]> = {
  editing: [
    { action: 'save', tooltipLocale: 'common.saveRename', Icon: CheckRounded },
    { action: 'cancel', tooltipLocale: 'common.cancelRename', Icon: CloseRounded }
  ],
  viewProject: [
    { action: 'rename', tooltipLocale: 'common.rename', Icon: EditRounded }
  ],
  empty: []
};

export const ITEM_GAP = 0.5;

export const RENAMEABLE_ITEM_STYLES: Record<'editingNameInput' | 'viewActions' | 'name', SxProps<Theme>> = {
  editingNameInput: {
    '&, &:hover': { backgroundColor: 'transparent' },
    flexGrow: 1,
    '& .MuiFilledInput-input': { fontSize: '1rem', lineHeight: 1.75, padding: 0 }
  },
  viewActions: {
    '& .renameable-item-view-action': { opacity: 0, transition: 'opacity 150ms ease-in-out' },
    '&:focus-within .renameable-item-view-action, &:hover .renameable-item-view-action': { opacity: 1 }
  },
  name: { flexGrow: 1 }
};

export const EDITING_BOX_PROPS = { component: 'form' } as const;
export const VIEW_BOX_PROPS = {
  component: 'div',
  sx: RENAMEABLE_ITEM_STYLES.viewActions
} as const;
