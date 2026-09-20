import type { FC } from 'react';

import { Alert, Snackbar } from '@mui/material';

import { AppShell } from './app-shell';
import { NewContentDialog } from './new-content-dialog';
import { ProjectStructureContext } from './ProjectStructureContext';
import { Renderer } from './renderer';
import { useAppContainer } from './useAppContainer';

const AppContainer: FC = () => {
  const {
    controls,
    disabledItemIds,
    handleAction,
    handleCloseNewContentDialog,
    handleCloseNotification,
    isNewContentDialogOpen,
    newContentStrategy,
    notification,
    projectStructure,
    selectedActionIds
  } = useAppContainer();

  return (
    <>
      <AppShell
        controls={controls}
        disabledItemIds={disabledItemIds}
        onAction={handleAction}
        selectedActionIds={selectedActionIds}
      >
        <ProjectStructureContext.Provider value={projectStructure}>
          <Renderer onAction={handleAction} />
        </ProjectStructureContext.Provider>
      </AppShell>
      <NewContentDialog
        onClose={handleCloseNewContentDialog}
        open={isNewContentDialogOpen}
        strategy={newContentStrategy}
      />
      <Snackbar
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        open={Boolean(notification)}
      >
        <Alert onClose={handleCloseNotification} severity="error" sx={{ width: '100%' }} variant="filled">
          {notification}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AppContainer;
