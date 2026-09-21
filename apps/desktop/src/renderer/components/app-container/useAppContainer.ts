import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import type { ApplicationAction, ProjectInfo, WindowControls } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import { SELECTED_ACTION_IDS_BY_LANGUAGE, UNAVAILABLE_WINDOW_CONTROLS } from './constants';
import { ProjectProxy } from './ProjectProxy';
import type { ContentStrategy } from './strategies';
import { BundleFolderStrategy, BundleStrategy, ProjectFolderStrategy, ProjectStrategy, TextureAtlasStrategy, type OpenNewContentResult } from './strategies';
import { notifyUnavailableDesktopApi } from './strategies/helpers';

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const disabledItemIds: readonly MenubarItemId[] = [];
  const [isNewContentDialogOpen, setNewContentDialogOpen] = useState(false);
  const [newContentAssetType, setNewContentAssetType] = useState<AssetType>(AssetType.ProjectFolder);
  const [notification, setNotification] = useState('');
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const projectProxy = useMemo(() => new ProjectProxy(setProject), []);
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
        if (project) projectProxy.replaceProject(project);
        else if (error) setNotification(error);
      })
      .catch(() => setNotification('The previously opened project could not be restored.'));
  }, [projectProxy]);

  const handleAction = useCallback(
    (action: ApplicationAction) => {
      switch (action) {
        case 'create-project':
          setNewContentAssetType(AssetType.Project);
          setNewContentDialogOpen(true);
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
            .then(projectProxy.replaceProject.bind(projectProxy))
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
    [i18n, projectProxy]
  );
  const contentStrategies = useMemo<Partial<Record<AssetType, ContentStrategy>>>(
    () => ({
      [AssetType.Bundle]: new BundleStrategy(projectProxy),
      [AssetType.BundleFolder]: new BundleFolderStrategy(projectProxy),
      [AssetType.Project]: new ProjectStrategy(projectProxy),
      [AssetType.ProjectFolder]: new ProjectFolderStrategy(projectProxy),
      [AssetType.TextureAtlas]: new TextureAtlasStrategy(projectProxy)
    }),
    [projectProxy]
  );
  const openNewContent = useCallback((result: OpenNewContentResult) => {
    const strategy = contentStrategies[result.assetType];
    if ('parentPath' in result) strategy?.setParentPath(result.parentPath);
    else strategy?.setParentId(result.parentId);

    setNewContentAssetType(result.assetType);
    setNewContentDialogOpen(true);
  }, [contentStrategies]);
  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    async (action, assetType, id, data) => {
      const result = await contentStrategies[assetType]?.handle(action, id, data);
      if (!result) return;

      switch (result.action) {
        case 'open-new-content':
          openNewContent(result);
          break;
        case 'show-notification':
          setNotification(result.message);
          break;
        default:
          break;
      }
    },
    [contentStrategies, openNewContent]
  );
  const projectStructure = useMemo(
    () => ({
      content: project?.content ?? [],
      folders: project?.folders ?? [],
      name: project?.name ?? '',
      onAction: handleWorkingScreenAction,
      path: project?.path ?? ''
    }),
    [handleWorkingScreenAction, project]
  );
  const handleCloseNewContentDialog = () => {
    setNewContentDialogOpen(false);
    contentStrategies[newContentAssetType]?.setParentPath('');
  };
  const handleCloseNotification = () => setNotification('');

  return {
    controls,
    disabledItemIds,
    handleAction,
    handleCloseNewContentDialog,
    handleCloseNotification,
    isNewContentDialogOpen,
    notification,
    projectStructure,
    newContentStrategy: contentStrategies[newContentAssetType]!,
    selectedActionIds
  };
};
