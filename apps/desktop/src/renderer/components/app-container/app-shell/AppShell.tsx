import { type FC, memo, type ReactNode } from 'react';

import { Box } from '@mui/material';

import { TITLE_BAR_HEIGHT } from '../../../constants';
import type { ApplicationAction, WindowControls } from '../../../types';

import { TitleBar } from './title-bar';
import type { MenubarItemId } from './title-bar/menubar';
import { useWindowControls } from './useWindowControls';

type AppShellProps = {
  children: ReactNode;
  controls: WindowControls;
  disabledItemIds: readonly MenubarItemId[];
  onAction: (action: ApplicationAction) => void;
  selectedActionIds: readonly ApplicationAction[];
};

const AppShell: FC<AppShellProps> = ({ children, controls, disabledItemIds, onAction, selectedActionIds }) => {
  const { isMaximized, onWindowControl } = useWindowControls(controls);

  return (
    <Box display="flex" flexDirection="column" height="100vh" overflow="hidden">
      <TitleBar
        disabledItemIds={disabledItemIds}
        isMaximized={isMaximized}
        onAction={onAction}
        onWindowControl={onWindowControl}
        selectedActionIds={selectedActionIds}
      />
      <Box display="flex" height={`calc(100vh - ${TITLE_BAR_HEIGHT}px)`} minHeight={0}>
        {children}
      </Box>
    </Box>
  );
};

export default memo(AppShell);
