import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BundleConfig, ProjectActionHandler } from '../../../types';

import type { ApplicationAction, NewProjectOptions, ProjectCreationValidation, WindowControls } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import { SELECTED_ACTION_IDS_BY_LANGUAGE, UNAVAILABLE_WINDOW_CONTROLS } from './constants';
import { useProjectProxy } from './useProjectProxy';

const EMPTY_BUNDLES = new Map<string, BundleConfig>();

const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const disabledItemIds: readonly MenubarItemId[] = [];
  const [isNewProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderParentPath, setNewFolderParentPath] = useState('');
  const [notification, setNotification] = useState('');
  const { addFolder, project, renameFolder, renameProject, replaceProject } = useProjectProxy();
  const controls = useMemo<WindowControls>(
    () =>
      new Proxy(window.manticore?.windowControls ?? UNAVAILABLE_WINDOW_CONTROLS, {
        get: (target, property) => Reflect.get(target, property) ?? Reflect.get(UNAVAILABLE_WINDOW_CONTROLS, property)
      }),
    []
  );
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  useEffect(() => {
    if (!window.manticore || !new URLSearchParams(window.location.search).has('restoreProject')) return;

    void window.manticore
      .restoreLastOpenedProject()
      .then(({ error, project }) => {
        if (project) replaceProject(project);
        else if (error) setNotification(error);
      })
      .catch(() => setNotification('The previously opened project could not be restored.'));
  }, [replaceProject]);

  const handleAction = useCallback(
    (action: ApplicationAction) => {
      switch (action) {
        case 'create-project':
          setNewProjectDialogOpen(true);
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
            .then(replaceProject)
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
    [i18n, replaceProject]
  );
  const handleCreateProject = useCallback(
    async (options: NewProjectOptions) => {
      if (!window.manticore) {
        notifyUnavailableDesktopApi();
        return;
      }

      replaceProject(await window.manticore.createProject(options));
    },
    [replaceProject]
  );
  const handleRenameProject = useCallback(
    async (name: string) => {
      if (!project || !window.manticore?.renameProject) {
        notifyUnavailableDesktopApi();
        return;
      }

      try {
        const renamedName = await window.manticore.renameProject(project.path, name);
        renameProject(renamedName);
      } catch (reason) {
        setNotification(reason instanceof Error ? reason.message : 'Could not rename the project.');
        throw reason;
      }
    },
    [project, renameProject]
  );
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!project || !window.manticore?.createProjectFolder) {
        notifyUnavailableDesktopApi();
        return;
      }

      const folderPath = newFolderParentPath ? `${newFolderParentPath}/${name}` : name;
      const folder = await window.manticore.createProjectFolder(project.path, folderPath);
      addFolder(folder);
    },
    [addFolder, newFolderParentPath, project]
  );
  const handleRenameProjectFolder = useCallback(
    async (id: number, name: string) => {
      if (!project || !window.manticore?.renameProjectFolder) {
        notifyUnavailableDesktopApi();
        return;
      }

      try {
        const folder = await window.manticore.renameProjectFolder(project.path, id, name);
        renameFolder(id, folder);
      } catch (reason) {
        setNotification(reason instanceof Error ? reason.message : 'Could not rename the folder.');
        throw reason;
      }
    },
    [project, renameFolder]
  );
  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    (action, contentType, id, data) => {
      switch (contentType) {
        case 'project':
          switch (action) {
            case 'add-folder':
              setNewFolderParentPath('');
              setNewFolderDialogOpen(true);
              return undefined;
            case 'rename':
              return typeof data === 'string' ? handleRenameProject(data) : undefined;
            default:
              return undefined;
          }
        case 'project-folder':
          switch (action) {
            case 'add-folder':
              if (typeof data !== 'string') return undefined;

              setNewFolderParentPath(data);
              setNewFolderDialogOpen(true);
              return undefined;
            case 'rename':
              return typeof data === 'string' ? handleRenameProjectFolder(id, data) : undefined;
            default:
              return undefined;
          }
        default:
          return undefined;
      }
    },
    [handleRenameProject, handleRenameProjectFolder]
  );
  const projectStructure = useMemo(
    () => ({
      bundles: project?.bundles ?? EMPTY_BUNDLES,
      folders: project?.folders ?? [],
      name: project?.name ?? '',
      onAction: handleWorkingScreenAction,
      path: project?.path ?? ''
    }),
    [handleWorkingScreenAction, project?.bundles, project?.folders, project?.name, project?.path]
  );
  const folderNamesAtNewFolderLevel = useMemo(
    () =>
      project?.folders
        .filter((folder) => {
          const separatorIndex = folder.name.lastIndexOf('/');
          const parentPath = separatorIndex === -1 ? '' : folder.name.slice(0, separatorIndex);

          return folder.name && parentPath === newFolderParentPath;
        })
        .map((folder) => folder.name.slice(newFolderParentPath ? newFolderParentPath.length + 1 : 0)) ?? [],
    [newFolderParentPath, project?.folders]
  );
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
  const handleCloseNewFolderDialog = () => {
    setNewFolderDialogOpen(false);
    setNewFolderParentPath('');
  };
  const handleCloseNewProjectDialog = () => setNewProjectDialogOpen(false);
  const handleCloseNotification = () => setNotification('');

  return {
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
  };
};
