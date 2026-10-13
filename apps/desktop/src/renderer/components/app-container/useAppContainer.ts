import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import { type KeyboardShortcutId, keyboardShortcuts } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo } from '../../types';

import { appContainerReducer, createInitialAppContainerState } from './appContainerReducer';
import { ContentAction } from './common';
import { NotificationError, SELECTED_ACTION_IDS_BY_LANGUAGE, WORKING_SCREEN_REDUCER_ACTIONS } from './constants';
import { notifyUnavailableDesktopApi } from './helpers';

const getSelectedProjectItem = (project: ProjectInfo, selection: readonly number[]) => {
  const selectedId = selection.at(-1) ?? 0;

  return selectedId === 0
    ? { id: 0, type: AssetType.Project }
    : project.content?.find((item) => item.id === selectedId);
};

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appContainerReducer, undefined, createInitialAppContainerState);
  const {
    contentStrategies,
    disabledItemIds,
    expandedItemIds,
    modalData,
    notificationError,
    project,
    projectProxy,
    selection
  } = state;
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
      if (WORKING_SCREEN_REDUCER_ACTIONS.includes(action)) {
        return dispatch({ type: action, payload: { assetType, data, id } });
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
    selection
  }), [expandedItemIds, handleWorkingScreenAction, onToggleExpanded, project, selection]);

  const handleCloseNotification = useCallback(() => showNotification(NotificationError.None), [showNotification]);
  return {
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
