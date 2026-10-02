import type { FC } from 'react';

import { AppShell } from './app-shell';
import { WINDOW_CONTROLS } from './constants';
import { DeleteContentDialog } from './delete-content-dialog';
import { ImportAssetsDialog } from './import-assets-dialog';
import type { ModalComponent, ModalType } from './modal-types';
import { NewContentDialog } from './new-content-dialog';
import NotificationSnackbar from './NotificationSnackbar';
import { ProjectStructureContext } from './ProjectStructureContext';
import { Renderer } from './renderer';
import { useAppContainer } from './useAppContainer';

const MODAL_TYPES: readonly ModalType[] = ['new-content', 'import-asset', 'delete-content'];
const MODAL_CONFIG: { [Type in ModalType]: ModalComponent<Type> } = {
  'delete-content': DeleteContentDialog,
  'import-asset': ImportAssetsDialog,
  'new-content': NewContentDialog
};

const AppContainer: FC = () => {
  const {
    disabledItemIds,
    handleAction,
    handleWorkingScreenAction,
    handleCloseNotification,
    modalData,
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
      {MODAL_TYPES.map((type) => {
        const Modal = MODAL_CONFIG[type] as ModalComponent<typeof type>;

        return <Modal {...modalData[type]} key={type} onAction={handleWorkingScreenAction} />;
      })}
      <NotificationSnackbar error={notificationError} onClose={handleCloseNotification} />
    </>
  );
};

export default AppContainer;
