import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import type { ApplicationAction, ProjectInfo } from '../../types';

import type { MenubarItemId } from './app-shell/title-bar/menubar';
import { ContentAction, OpenImportAssets } from './common';
import { NotificationError, SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { ProjectProxy } from './ProjectProxy';
import type { ContentStrategy } from './strategies';
import { CONTENT_STRATEGY_CONSTRUCTORS, type OpenNewContentData } from './strategies';
import { notifyUnavailableDesktopApi } from './strategies/helpers';

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const disabledItemIds: readonly MenubarItemId[] = [];
  const [isNewContentDialogOpen, setNewContentDialogOpen] = useState(false);
  const [isImportAssetsDialogOpen, setImportAssetsDialogOpen] = useState(false);
  const [importBundleId, setImportBundleId] = useState(0);
  const [newContentAssetType, setNewContentAssetType] = useState<AssetType>(AssetType.ProjectFolder);
  const [notificationError, setNotificationError] = useState(NotificationError.None);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const projectProxy = useMemo(() => new ProjectProxy(setProject), []);
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  useEffect(() => {
    if (!window.manticore || !new URLSearchParams(window.location.search).has('restoreProject')) return;

    void window.manticore
      .restoreLastOpenedProject()
      .then(({ error, project }) => {
        if (project) projectProxy.replaceProject(project);
        else if (error) setNotificationError(NotificationError.RestoreProject);
      })
      .catch(() => setNotificationError(NotificationError.RestoreProject));
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
            .catch(() => setNotificationError(NotificationError.OpenProject));
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
  const contentStrategies = useMemo<ReadonlyMap<AssetType, ContentStrategy>>(
    () => CONTENT_STRATEGY_CONSTRUCTORS.reduce<Map<AssetType, ContentStrategy>>(
      (strategies, [assetType, Strategy]) => strategies.set(assetType, new Strategy(projectProxy)),
      new Map()
    ),
    [projectProxy]
  );

  const openNewContent = useCallback(({ assetType, fields }: OpenNewContentData) => {
    const strategy = contentStrategies.get(assetType);
    if (!strategy) {
      setNotificationError(NotificationError.ContentTypeUnavailable);
      return;
    }

    try {
      strategy.setFields(fields);
      setNewContentAssetType(assetType);
      setNewContentDialogOpen(true);
    } catch {
      setNotificationError(NotificationError.ContentConfiguration);
    }
  }, [contentStrategies]);
  const openImportAssets = useCallback(({ bundleId }: OpenImportAssets) => {
    const bundles = project?.content?.filter((content) => content.type === AssetType.Bundle) ?? [];
    const selectedBundle = bundles.find((bundle) => bundle.id === bundleId) ?? bundles[0];
    if (!selectedBundle) {
      setNotificationError(NotificationError.ContentTypeUnavailable);
      return;
    }

    setImportBundleId(selectedBundle.id);
    setImportAssetsDialogOpen(true);
  }, [project]);

  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    async (action, assetType, id, data) => {
      const result = await contentStrategies.get(assetType)?.handle(new ContentAction(id, action, data));
      if (!result) return;

      switch (result.action) {
        case 'open-new-content':
          openNewContent(result.data);
          break;
        case 'open-import-assets':
          openImportAssets(result.data);
          break;
        case 'show-notification':
          setNotificationError(result.data.error);
          break;
        default:
          break;
      }
    },
    [contentStrategies, openImportAssets, openNewContent]
  );

  const projectStructure = useMemo(
    () => ({ onAction: handleWorkingScreenAction,  project }),
    [handleWorkingScreenAction, project]
  );

  const newContentStrategy = contentStrategies.get(newContentAssetType)!;
  const handleCloseNewContentDialog = useCallback(() => {
    setNewContentDialogOpen(false);
    newContentStrategy.setField('parentPath', '');
  }, [newContentStrategy]);
  const handleCloseImportAssetsDialog = useCallback(() => setImportAssetsDialogOpen(false), []);
  const handleImportAssets = useCallback(async (bundleId: number, filePaths: readonly string[]) => {
    if (!project || !window.manticore?.importAssets) {
      notifyUnavailableDesktopApi();
      return false;
    }

    try {
      await window.manticore.importAssets(project.path, bundleId, [...filePaths]);
      return true;
    } catch {
      setNotificationError(NotificationError.ImportAssets);
      return false;
    }
  }, [project]);

  const handleCloseNotification = useCallback(() => setNotificationError(NotificationError.None), []);

  return {
    disabledItemIds,
    handleAction,
    handleCloseNewContentDialog,
    handleCloseImportAssetsDialog,
    handleImportAssets,
    handleCloseNotification,
    isNewContentDialogOpen,
    isImportAssetsDialogOpen,
    importBundleId,
    notificationError,
    projectStructure,
    newContentStrategy,
    selectedActionIds
  };
};
