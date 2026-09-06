import { type FC, memo, type ReactNode } from 'react';

import { Box } from '@mui/material';

import { TITLE_BAR_HEIGHT } from '../../../constants';
import type { ApplicationAction, WindowControls } from '../../../types';

import { TitleBar } from './title-bar';
import { useWindowControls } from './useWindowControls';

type AppShellProps = {
  children: ReactNode;
  controls?: WindowControls;
  onAction: (action: ApplicationAction) => void;
};

const AppShell: FC<AppShellProps> = ({ children, controls, onAction }) => {
  const { isMaximized, onWindowControl } = useWindowControls(controls);

  return (
    <Box display="flex" flexDirection="column" height="100vh" overflow="hidden">
      <TitleBar
        isMaximized={isMaximized}
        onAction={onAction}
        onWindowControl={onWindowControl}
        showWindowControls={Boolean(controls)}
      />
      <Box display="flex" height={`calc(100vh - ${TITLE_BAR_HEIGHT}px)`} minHeight={0}>
        {children}
      </Box>
    </Box>
  );
};

export default memo(AppShell);
