import type { ProjectContent } from '@manticore/project/types';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import { type KeyboardShortcutId, keyboardShortcuts } from '../../keyboard-shortcuts';
import type { ApplicationAction } from '../../types';

import { appContainerReducer, INITIAL_APP_CONTAINER_STATE } from './appContainerReducer';
import { ContentAction } from './common';
import { NOTIFICATION_LOCALE_KEYS, NotificationError, ProjectItemId, SELECTED_ACTION_IDS_BY_LANGUAGE, WORKING_SCREEN_REDUCER_ACTIONS } from './constants';
import { notifyUnavailableDesktopApi } from './helpers';
import { CONTENT_STRATEGIES } from './strategies';
import type { AppContainerAction } from './types';

const getSelectedProjectItem = (contentById: Readonly<Record<number, ProjectContent>>, selection: readonly number[]) => {
  const selectedId = selection.at(-1) ?? ProjectItemId.Project;

  return selectedId === ProjectItemId.Project
    ? { id: ProjectItemId.Project, type: AssetType.Project }
    : contentById[selectedId];
};

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appContainerReducer, INITIAL_APP_CONTAINER_STATE);
  const {
    activeModalType,
    childrenIdsByParentId,
    contentById,
    disabledItemIds,
    expandedItemIds,
    modalData,
    notifications,
    projectName,
    projectPath,
    selection,
    visibleProjectItems
  } = state;
  const selectedIdSet = useMemo(() => new Set(selection), [selection]);
  const showNotification = useCallback(
    (error: NotificationError) => dispatch({
      type: 'show-notification',
      payload: { notification: { message: NOTIFICATION_LOCALE_KEYS[error], type: 'error' } }
    }),
    []
  );
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  useEffect(() => {
    if (!window.manticore || !new URLSearchParams(window.location.search).has('restoreProject')) return;

    void window.manticore
      .restoreLastOpenedProject()
      .then((payload) => dispatch({ type: 'restore-project-completed', payload }))
      .catch(() => showNotification(NotificationError.RestoreProject));
  }, [showNotification]);
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
            .then((data) => dispatch({
              type: 'project-opened',
              payload: { assetType: AssetType.Project, data, id: ProjectItemId.Project }
            }))
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
    [i18n, showNotification]
  );

  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    async (action, assetType, id, data) => {
      if (WORKING_SCREEN_REDUCER_ACTIONS.has(action)) {
        return dispatch({ type: action, payload: { assetType, data, id } } as AppContainerAction);
      }

      const result = await CONTENT_STRATEGIES.get(assetType)?.handle(new ContentAction(id, action, data), projectPath);

      if (!result) {
        return;
      }

      return dispatch(result.getResult());
    },
    [projectPath]
  );
  const handleShortcut = useCallback((shortcutId: KeyboardShortcutId) => {
    if (!projectPath) return;

    const selectedItem = getSelectedProjectItem(contentById, selection);
    if (!selectedItem) return;

    const action = keyboardShortcuts.getAction(shortcutId, selectedItem.type);
    if (!action) return;

    void handleWorkingScreenAction(action, selectedItem.type, selectedItem.id);
  }, [contentById, handleWorkingScreenAction, projectPath, selection]);
  useEffect(() => keyboardShortcuts.subscribe(handleShortcut), [handleShortcut]);

  const projectStructure = useMemo(() => ({
    childrenIdsByParentId,
    contentById,
    expandedItemIds,
    onAction: handleWorkingScreenAction,
    projectName,
    projectPath,
    selection,
    selectedIdSet,
    visibleProjectItems
  }), [childrenIdsByParentId, contentById, expandedItemIds, handleWorkingScreenAction, projectName, projectPath, selectedIdSet, selection, visibleProjectItems]);

  const handleCloseNotification = useCallback((id: string) => {
    dispatch({ type: 'close-notification', payload: id });
  }, []);
  return {
    activeModalType,
    disabledItemIds,
    handleAction,
    handleCloseNotification,
    handleWorkingScreenAction,
    modalData,
    notifications,
    projectStructure,
    selectedActionIds
  };
};
