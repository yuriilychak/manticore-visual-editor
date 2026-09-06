import { type FC, useCallback } from 'react';

import type { ApplicationAction } from '../../types';

import { AppShell } from './app-shell';
import { Renderer } from './renderer';

const AppContainer: FC = () => {
  const handleAction = useCallback((action: ApplicationAction) => {
    void action;
  }, []);

  return (
    <AppShell controls={window.manticore?.windowControls} onAction={handleAction}>
      <Renderer onAction={handleAction} />
    </AppShell>
  );
};

export default AppContainer;
