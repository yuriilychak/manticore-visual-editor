import CloseRounded from '@mui/icons-material/CloseRounded';
import CropSquareRounded from '@mui/icons-material/CropSquareRounded';
import FilterNoneRounded from '@mui/icons-material/FilterNoneRounded';
import MinimizeRounded from '@mui/icons-material/MinimizeRounded';

import { TITLE_BAR_HEIGHT } from '../../../../constants';

import type { WindowControlButton } from './types';

const TITLE_BAR_LOGO_SIZE = 32;

export const TITLE_BAR_STYLES = {
  root: { WebkitAppRegion: 'drag', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' },
  logo: { height: TITLE_BAR_LOGO_SIZE, ml: 1.5, userSelect: 'none' },
  controls: { WebkitAppRegion: 'no-drag' },
  button: { borderRadius: 0, height: TITLE_BAR_HEIGHT, width: 46 },
  closeButton: {
    borderRadius: 0,
    height: TITLE_BAR_HEIGHT,
    width: 46,
    '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' }
  }
} as const;

export const WINDOW_CONTROL_BUTTONS: readonly WindowControlButton[] = [
  {
    action: 'minimize',
    ariaLabel: 'Minimize window',
    Icon: MinimizeRounded,
    sx: TITLE_BAR_STYLES.button
  },
  {
    action: 'toggle-maximize',
    ariaLabel: 'Maximize window',
    Icon: CropSquareRounded,
    isVisibleWhenMaximized: false,
    sx: TITLE_BAR_STYLES.button
  },
  {
    action: 'toggle-maximize',
    ariaLabel: 'Restore window',
    Icon: FilterNoneRounded,
    isVisibleWhenMaximized: true,
    sx: TITLE_BAR_STYLES.button
  },
  { action: 'close', ariaLabel: 'Close window', Icon: CloseRounded, sx: TITLE_BAR_STYLES.closeButton }
];
