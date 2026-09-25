import type { FC } from 'react';

import { AppShell } from './app-shell';
import { NewContentDialog } from './new-content-dialog';
import NotificationSnackbar from './NotificationSnackbar';
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
    notificationError,
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
      <NotificationSnackbar error={notificationError} onClose={handleCloseNotification} />
    </>
  );
};

export default AppContainer;
