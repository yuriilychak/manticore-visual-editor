import { type FC, memo, type ReactNode } from 'react';

import { Box } from '@mui/material';

import { TITLE_BAR_HEIGHT } from '../../constants';
import type { WindowControls } from '../../types';

import TitleBar from './title-bar/TitleBar';
import { useWindowControls } from './useWindowControls';

type AppShellProps = {
  children: ReactNode;
  controls?: WindowControls;
};

const AppShell: FC<AppShellProps> = ({ children, controls }) => {
  const { isMaximized, onWindowControl } = useWindowControls(controls);

  return (
    <Box display="flex" flexDirection="column" height="100vh" overflow="hidden">
      <TitleBar isMaximized={isMaximized} onWindowControl={onWindowControl} showWindowControls={Boolean(controls)} />
      <Box display="flex" height={`calc(100vh - ${TITLE_BAR_HEIGHT}px)`} minHeight={0}>
        {children}
      </Box>
    </Box>
  );
};

export default memo(AppShell);
