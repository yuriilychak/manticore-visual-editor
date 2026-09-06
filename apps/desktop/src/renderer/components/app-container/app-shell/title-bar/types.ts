import type MinimizeRounded from '@mui/icons-material/MinimizeRounded';
import type { SxProps, Theme } from '@mui/material/styles';

import type { WindowControlAction } from '../../../../types';

export type WindowControlButton = {
  action: WindowControlAction;
  ariaLabel: string;
  Icon: typeof MinimizeRounded;
  isVisibleWhenMaximized?: boolean;
  sx: SxProps<Theme>;
};
