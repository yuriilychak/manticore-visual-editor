import type { SxProps, Theme } from '@mui/material/styles';

import { ITEM_HEIGHT } from '../renameable-item/constants';

export { PROJECT_ITEM_CONFIG } from '../../../constants';

export const DISABLED_ACTIONS: Record<string, boolean> = {};

export const PROJECT_ITEM_STYLES: Record<'root', SxProps<Theme>> = {
  root: {
    border: 1,
    borderColor: 'transparent',
    display: "flex",
    alignItems: "center",
    boxSizing: 'border-box',
    borderRadius: 1,
    minHeight: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    px: 0.5,
    transition: theme => theme.transitions.create('background-color'),
    '&:hover': { bgcolor: 'action.hover' },
    '&[aria-selected="true"], &[aria-selected="true"]:hover': { bgcolor: 'action.selected' },
    '&[data-menu-open="true"]': { borderColor: 'primary.main' }
  }
};
