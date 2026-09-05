import { type FC, memo, type ReactNode } from 'react';

import { Box } from '@mui/material';

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
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <TitleBar isMaximized={isMaximized} onWindowControl={onWindowControl} showWindowControls={Boolean(controls)} />
      {children}
    </Box>
  );
};

export default memo(AppShell);
