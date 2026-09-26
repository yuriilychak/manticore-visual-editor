import type { FC } from 'react';

import { AssetType } from '../../../types';

import { AppShell } from './app-shell';
import { WINDOW_CONTROLS } from './constants';
import { NewContentDialog } from './new-content-dialog';
import { ImportAssetsDialog } from './import-assets-dialog';
import NotificationSnackbar from './NotificationSnackbar';
import { ProjectStructureContext } from './ProjectStructureContext';
import { Renderer } from './renderer';
import { useAppContainer } from './useAppContainer';

const AppContainer: FC = () => {
  const {
    disabledItemIds,
    handleAction,
    handleCloseNewContentDialog,
    handleCloseImportAssetsDialog,
    handleWorkingScreenAction,
    handleCloseNotification,
    isNewContentDialogOpen,
    isImportAssetsDialogOpen,
    importBundleId,
    importErrors,
    newContentStrategy,
    notificationError,
    projectStructure,
    selectedActionIds
  } = useAppContainer();

  return (
    <>
      <AppShell
        controls={WINDOW_CONTROLS}
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
      <ImportAssetsDialog
        bundles={projectStructure.project?.content?.filter((content) => content.type === AssetType.Bundle) ?? []}
        initialBundleId={importBundleId}
        importErrors={importErrors}
        onClose={handleCloseImportAssetsDialog}
        onAction={handleWorkingScreenAction}
        open={isImportAssetsDialogOpen}
      />
      <NotificationSnackbar error={notificationError} onClose={handleCloseNotification} />
    </>
  );
};

export default AppContainer;
