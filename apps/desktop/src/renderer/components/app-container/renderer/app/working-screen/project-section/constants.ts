import type { SxProps, Theme } from '@mui/material/styles';

export const TREE_ACCORDION_STYLES: Record<string, SxProps<Theme>> = {
  details: { p: 0 },
  root: { bgcolor: 'transparent', border: 0, m: 0, '&.Mui-expanded': { m: 0 }, '&::before': { display: 'none' } },
  summary: { minHeight: 0, px: 0, '&.Mui-expanded': { minHeight: 0 }, '& .MuiAccordionSummary-content': { my: 0 } }
};

export const TREE_ACCORDION_SLOT_PROPS = { transition: { unmountOnExit: false } };
export const TREE_ACCORDION_SLOTS = { heading: 'div' } as const;
