import type { PanePercentages } from './types';

export const MIN_PANE_SIZE = 128;
export const DIVIDER_SIZE = 4;
export const PANE_PERCENTAGES_STORAGE_KEY = 'manticore:working-screen-pane-percentages';

export const DEFAULT_PANE_PERCENTAGES: PanePercentages = { left: 25, right: 25, top: 75 };
export const PANE_PERCENTAGE_KEYS = Object.keys(DEFAULT_PANE_PERCENTAGES) as Array<keyof PanePercentages>;

export const STYLES = {
  horizontalDivider: {
    bgcolor: 'divider',
    cursor: 'row-resize',
    touchAction: 'none'
  },
  verticalDivider: {
    bgcolor: 'divider',
    cursor: 'col-resize',
    touchAction: 'none'
  }
} as const;
