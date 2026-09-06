import { type FC, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Snackbar } from '@mui/material';

import type { ApplicationAction, NewProjectOptions, ProjectCreationValidation, WindowControls } from '../../types';

import { AppShell } from './app-shell';
import type { MenubarItemId } from './app-shell/title-bar/menubar';
import { SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { NewProjectDialog } from './new-project-dialog';
import { Renderer } from './renderer';

const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

const UNAVAILABLE_WINDOW_CONTROLS: WindowControls = {
  close: async () => notifyUnavailableDesktopApi(),
  isMaximized: async () => false,
  minimize: async () => notifyUnavailableDesktopApi(),
  onMaximizeChange: () => () => undefined,
  toggleMaximize: async () => {
    notifyUnavailableDesktopApi();
    return false;
  }
};

const AppContainer: FC = () => {
  const { i18n } = useTranslation();
  const disabledItemIds: readonly MenubarItemId[] = [];
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [notification, setNotification] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const controls = useMemo<WindowControls>(
    () =>
      new Proxy(window.manticore?.windowControls ?? UNAVAILABLE_WINDOW_CONTROLS, {
        get: (target, property) => Reflect.get(target, property) ?? Reflect.get(UNAVAILABLE_WINDOW_CONTROLS, property)
      }),
    []
  );
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  const handleAction = useCallback(
    (action: ApplicationAction) => {
      switch (action) {
        case 'create-project':
          setIsNewProjectDialogOpen(true);
          break;
        case 'create-window':
          if (window.manticore) void window.manticore.createWindow(i18n.language);
          else notifyUnavailableDesktopApi();
          break;
        case 'open-project':
          if (!window.manticore) {
            notifyUnavailableDesktopApi();
            break;
          }
          void window.manticore
            .openProject()
            .then(({ path }) => setProjectPath(path))
            .catch((reason: unknown) =>
              setNotification(reason instanceof Error ? reason.message : 'Could not open the project.')
            );
          break;
        case 'set-language-en':
          void i18n.changeLanguage('en');
          break;
        case 'set-language-es':
          void i18n.changeLanguage('es');
          break;
        default:
          void action;
      }
    },
    [i18n]
  );
  const handleCreateProject = useCallback(async (options: NewProjectOptions) => {
    if (!window.manticore) {
      notifyUnavailableDesktopApi();
      return;
    }

    setProjectPath(await window.manticore.createProject(options));
  }, []);
  const handleSelectProjectLocation = useCallback(async () => {
    if (!window.manticore) {
      notifyUnavailableDesktopApi();
      return '';
    }

    return window.manticore.selectProjectLocation();
  }, []);
  const handleValidateProject = useCallback(async (options: NewProjectOptions): Promise<ProjectCreationValidation> => {
    if (!window.manticore) return { isAvailable: false, reason: 'invalid-name' };
    return window.manticore.canCreateProject(options);
  }, []);

  const handleCloseNotification = () => setNotification('');

  return (
    <>
      <AppShell
        controls={controls}
        disabledItemIds={disabledItemIds}
        onAction={handleAction}
        selectedActionIds={selectedActionIds}
      >
        <Renderer onAction={handleAction} projectPath={projectPath} />
      </AppShell>
      <NewProjectDialog
        onClose={() => setIsNewProjectDialogOpen(false)}
        onCreate={handleCreateProject}
        onSelectLocation={handleSelectProjectLocation}
        onValidate={handleValidateProject}
        open={isNewProjectDialogOpen}
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
