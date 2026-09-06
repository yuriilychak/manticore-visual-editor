import { type FC, memo, type MouseEvent, useCallback, useMemo } from 'react';

import { Box, IconButton } from '@mui/material';

import { TITLE_BAR_HEIGHT } from '../../../../constants';
import type { ApplicationAction, WindowControlAction } from '../../../../types';

import { TITLE_BAR_STYLES, WINDOW_CONTROL_BUTTONS } from './constants';
import { Menubar, type MenubarItemId } from './menubar';

type TitleBarProps = {
  disabledItemIds: readonly MenubarItemId[];
  isMaximized: boolean;
  onAction: (action: ApplicationAction) => void;
  onWindowControl: (action: WindowControlAction) => Promise<void>;
  selectedActionIds: readonly ApplicationAction[];
};

const TitleBar: FC<TitleBarProps> = ({
  disabledItemIds,
  isMaximized,
  onAction,
  onWindowControl,
  selectedActionIds
}) => {
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
        <Menubar disabledItemIds={disabledItemIds} onAction={onAction} selectedActionIds={selectedActionIds} />
      </Box>
      {visibleWindowControlButtons.length > 0 && (
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
