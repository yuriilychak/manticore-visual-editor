import { type FC, memo, type MouseEvent, useCallback, useMemo } from 'react';

import { Box, IconButton } from '@mui/material';

import { TITLE_BAR_HEIGHT } from '../../../constants';
import type { WindowControlAction } from '../../../types';

import Menubar from '../menubar/Menubar';

import { TITLE_BAR_STYLES, WINDOW_CONTROL_BUTTONS } from './constants';

type TitleBarProps = {
  isMaximized: boolean;
  onWindowControl: (action: WindowControlAction) => Promise<void>;
  showWindowControls: boolean;
};

const TitleBar: FC<TitleBarProps> = ({ isMaximized, onWindowControl, showWindowControls }) => {
  const visibleWindowControlButtons = useMemo(
    () =>
      WINDOW_CONTROL_BUTTONS.filter(
        ({ isVisibleWhenMaximized = isMaximized }) => isVisibleWhenMaximized === isMaximized
      ),
    [isMaximized]
  );

  const handleWindowControl = useCallback(
    (event: MouseEvent<HTMLElement>) =>
      void onWindowControl((event.currentTarget.dataset.windowAction ?? 'none') as WindowControlAction),
    [onWindowControl]
  );

  return (
    <Box
      alignItems="center"
      display="flex"
      height={TITLE_BAR_HEIGHT}
      justifyContent="space-between"
      data-window-action="toggle-maximize"
      onDoubleClick={handleWindowControl}
      sx={TITLE_BAR_STYLES.root}
    >
      <Box alignItems="center" display="flex" flexGrow={1} gap={1}>
        <Box alt="Manticore Visual Editor" component="img" src="./asset/logo.svg" sx={TITLE_BAR_STYLES.logo} />
        <Menubar />
      </Box>
      {showWindowControls && visibleWindowControlButtons.length > 0 && (
        <Box display="flex" sx={TITLE_BAR_STYLES.controls}>
          {visibleWindowControlButtons.map(({ action, ariaLabel, Icon, sx }) => (
            <IconButton
              aria-label={ariaLabel}
              color="inherit"
              data-window-action={action}
              key={action}
              onClick={handleWindowControl}
              size="small"
              sx={sx}
            >
              <Icon fontSize="small" />
            </IconButton>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default memo(TitleBar);
