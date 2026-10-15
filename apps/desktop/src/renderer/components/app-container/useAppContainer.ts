import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import { type KeyboardShortcutId, keyboardShortcuts } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo } from '../../types';

import { appContainerReducer, createInitialAppContainerState } from './appContainerReducer';
import { ContentAction } from './common';
import { NotificationError, SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { notifyUnavailableDesktopApi } from './helpers';

const getSelectedProjectItem = (project: ProjectInfo, selection: readonly number[]) => {
  const selectedId = selection.at(-1) ?? 0;

  return selectedId === 0
    ? { id: 0, type: AssetType.Project }
    : project.content?.find((item) => item.id === selectedId);
};

const isSelectionData = (data: unknown): data is { id: number; isExtended: boolean; isRange: boolean } =>
  typeof data === 'object' && data !== null
  && typeof (data as { id?: unknown }).id === 'number'
  && typeof (data as { isExtended?: unknown }).isExtended === 'boolean'
  && typeof (data as { isRange?: unknown }).isRange === 'boolean';

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appContainerReducer, undefined, createInitialAppContainerState);
  const {
    activeModalType,
    contentStrategies,
    disabledItemIds,
    expandedItemIds,
    modalData,
    notificationError,
    projectProxy,
    selection
  } = state;
  const project = projectProxy.project;
  const selectedIdSet = useMemo(() => new Set(selection), [selection]);
  const showNotification = useCallback(
    (error: NotificationError) => dispatch({ type: 'show-notification', payload: { error } }),
    []
  );
  useEffect(() => {
    projectProxy.setOnProjectChange((project) => dispatch({ type: 'project-changed', payload: project }));

    return () => projectProxy.setOnProjectChange();
  }, [projectProxy]);
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  useEffect(() => {
    if (!window.manticore || !new URLSearchParams(window.location.search).has('restoreProject')) return;

    void window.manticore
      .restoreLastOpenedProject()
      .then((payload) => dispatch({ type: 'restore-project-completed', payload }))
      .catch(() => showNotification(NotificationError.RestoreProject));
  }, [showNotification]);
  const onToggleExpanded = useCallback((id: number) => dispatch({ type: 'expanded-item-toggled', payload: id }), []);

  const handleAction = useCallback(
    (action: ApplicationAction) => {
      switch (action) {
        case 'create-project':
          dispatch({ type: 'create-project' });
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
            .catch(() => showNotification(NotificationError.OpenProject));
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
    [i18n, projectProxy, showNotification]
  );

  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    async (action, assetType, id, data) => {
      switch (action) {
        case 'select':
          if (!isSelectionData(data)) return;
          return dispatch({ type: action, payload: { assetType, data, id } });
        case 'open-delete-modal':
          return dispatch({ type: action, payload: { assetType, data, id } });
        case 'selection-cleared':
        case 'close-delete-modal':
        case 'close-new-content-dialog':
        case 'close-import-assets-dialog':
          return dispatch({ type: action });
      }

      const result = await contentStrategies.get(assetType)?.handle(new ContentAction(id, action, data));

      if (!result) {
        return;
      }

      return dispatch(result.getResult());
    },
    [contentStrategies]
  );
  const handleShortcut = useCallback((shortcutId: KeyboardShortcutId) => {
    if (!project) return;

    const selectedItem = getSelectedProjectItem(project, selection);
    if (!selectedItem) return;

    const action = keyboardShortcuts.getAction(shortcutId, selectedItem.type);
    if (!action) return;

    void handleWorkingScreenAction(action, selectedItem.type, selectedItem.id);
  }, [handleWorkingScreenAction, project, selection]);
  useEffect(() => keyboardShortcuts.subscribe(handleShortcut), [handleShortcut]);

  const projectStructure = useMemo(() => ({
    expandedItemIds,
    onAction: handleWorkingScreenAction,
    onToggleExpanded,
    project,
    selection,
    selectedIdSet
  }), [expandedItemIds, handleWorkingScreenAction, onToggleExpanded, project, selectedIdSet, selection]);

  const handleCloseNotification = useCallback(() => showNotification(NotificationError.None), [showNotification]);
  return {
    activeModalType,
    disabledItemIds,
    handleAction,
    handleCloseNotification,
    handleWorkingScreenAction,
    modalData,
    notificationError,
    projectStructure,
    selectedActionIds
  };
};
