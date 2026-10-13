import type { FC } from 'react';

import { AppShell } from './app-shell';
import { ApplicationActionContext } from './ApplicationActionContext';
import AppModal from './AppModal';
import { MODAL_TYPES, WINDOW_CONTROLS } from './constants';
import NotificationSnackbar from './NotificationSnackbar';
import { ProjectStructureContext } from './ProjectStructureContext';
import { Renderer } from './renderer';
import { useAppContainer } from './useAppContainer';

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
        <ApplicationActionContext.Provider value={handleAction}>
          <ProjectStructureContext.Provider value={projectStructure}>
            <Renderer />
          </ProjectStructureContext.Provider>
        </ApplicationActionContext.Provider>
      </AppShell>
      {MODAL_TYPES.map((type) => (
        <AppModal key={type} modalData={modalData} onAction={handleWorkingScreenAction} type={type} />
      ))}
      <NotificationSnackbar error={notificationError} onClose={handleCloseNotification} />
    </>
  );
};

export default AppContainer;
