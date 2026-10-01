import type { SxProps, Theme } from '@mui/material/styles';

export const PROJECT_ITEM_STYLES: Record<'root', SxProps<Theme>> = {
  root: {
    borderRadius: 1,
    px: 0.5,
    transition: theme => theme.transitions.create('background-color'),
    '&:hover': { bgcolor: 'action.hover' },
    '&[aria-selected="true"], &[aria-selected="true"]:hover': { bgcolor: 'action.selected' }
  }
};
