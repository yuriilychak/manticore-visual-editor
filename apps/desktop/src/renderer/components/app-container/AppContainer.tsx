import type { FC } from 'react';

import { Alert, Snackbar } from '@mui/material';

import { AppShell } from './app-shell';
import { NewFolderDialog } from './new-folder-dialog';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectStructureContext } from './ProjectStructureContext';
import { Renderer } from './renderer';
import { useAppContainer } from './useAppContainer';

const AppContainer: FC = () => {
  const {
    controls,
    disabledItemIds,
    handleAction,
    handleCloseNewFolderDialog,
    handleCloseNewProjectDialog,
    handleCloseNotification,
    handleCreateFolder,
    handleCreateProject,
    handleSelectProjectLocation,
    handleValidateProject,
    isNewFolderDialogOpen,
    isNewProjectDialogOpen,
    notification,
    projectStructure,
    folderNamesAtNewFolderLevel,
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
      <NewProjectDialog
        onClose={handleCloseNewProjectDialog}
        onCreate={handleCreateProject}
        onSelectLocation={handleSelectProjectLocation}
        onValidate={handleValidateProject}
        open={isNewProjectDialogOpen}
      />
      <NewFolderDialog
        existingFolderNames={folderNamesAtNewFolderLevel}
        onClose={handleCloseNewFolderDialog}
        onCreate={handleCreateFolder}
        open={isNewFolderDialogOpen}
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
