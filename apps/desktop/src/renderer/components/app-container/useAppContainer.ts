import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetType, type ProjectActionHandler } from '../../../types';

import { type KeyboardShortcutId, keyboardShortcuts } from '../../keyboard-shortcuts';
import type { ApplicationAction, ProjectInfo } from '../../types';

import { appContainerReducer, createInitialAppContainerState } from './appContainerReducer';
import { ContentAction } from './common';
import { NotificationError, SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { PROJECT_ITEM_CONFIG } from './renderer/working-screen/project-section/constants';
import { notifyUnavailableDesktopApi } from './strategies/helpers';

const getSelectedProjectItem = (project: ProjectInfo, selectedItems: readonly number[]) => {
  const selectedId = selectedItems.at(-1) ?? 0;

  return selectedId === 0
    ? { id: 0, type: AssetType.Project }
    : project.content?.find((item) => item.id === selectedId);
};

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appContainerReducer, undefined, createInitialAppContainerState);
  const [expandedItemIds, setExpandedItemIds] = useState<readonly number[]>([]);
  const previousProjectRef = useRef<{ contentIds: ReadonlySet<number>; path: string } | undefined>(undefined);
  useEffect(() => {
    state.projectProxy.setOnProjectChange((project) => dispatch({ type: 'project-changed', payload: project }));

    return () => state.projectProxy.setOnProjectChange();
  }, [state.projectProxy]);
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  useEffect(() => {
    if (!window.manticore || !new URLSearchParams(window.location.search).has('restoreProject')) return;

    void window.manticore
      .restoreLastOpenedProject()
      .then((payload) => dispatch({ type: 'restore-project-completed', payload }))
      .catch(() => dispatch({ type: 'notification-error-set', payload: NotificationError.RestoreProject }));
  }, []);
  useEffect(() => {
    const project = state.project;
    const content = project?.content ?? [];
    const previousProject = previousProjectRef.current;
    const createdItems = previousProject && previousProject.path === project?.path
      ? content.filter((item) => !previousProject.contentIds.has(item.id))
      : [];
    previousProjectRef.current = project ? { contentIds: new Set(content.map((item) => item.id)), path: project.path } : undefined;

    setExpandedItemIds((current) => {
      const validExpandedItemIds = current.filter((id) => {
        const item = content.find((contentItem) => contentItem.id === id);

        return Boolean(item && PROJECT_ITEM_CONFIG[item.type].expandable && content.some((contentItem) => contentItem.parentId === id));
      });
      const nextExpandedItemIds = createdItems.reduce<readonly number[]>((ids, { parentId }) => {
        const parent = content.find((item) => item.id === parentId);

        return parent && PROJECT_ITEM_CONFIG[parent.type].expandable && !ids.includes(parentId)
          ? ids.concat(parentId)
          : ids;
      }, validExpandedItemIds);

      return nextExpandedItemIds.length === current.length && nextExpandedItemIds.every((id, index) => id === current[index])
        ? current
        : nextExpandedItemIds;
    });
  }, [state.project]);

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
            .then(state.projectProxy.replaceProject.bind(state.projectProxy))
            .catch(() => dispatch({ type: 'notification-error-set', payload: NotificationError.OpenProject }));
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
    [i18n, state.projectProxy]
  );

  const handleWorkingScreenAction = useCallback<ProjectActionHandler>(
    async (action, assetType, id, data) => {
      switch (action) {
        case 'select': {
          dispatch({ type: 'selection-changed', payload: { id, isExtended: Boolean(data) } });
          return;
        }
        case 'selection-cleared':
          dispatch({ type: 'selection-cleared' });
          return;
        case 'open-delete-modal':
          dispatch({ type: 'delete-content-opened', payload: { assetType, id } });
          return;
        case 'close-delete-modal':
          dispatch({ type: 'delete-content-closed' });
          return;
        case 'close-new-content-dialog':
          dispatch({ type: 'new-content-dialog-closed' });
          return;
        case 'close-import-assets-dialog':
          dispatch({ type: 'import-assets-dialog-closed' });
          return;
        case 'delete': {
          const ids = Array.isArray(data) && data.every((item) => typeof item === 'number') ? data : [id];
          const project = state.project;

          if (!project || !window.manticore?.deleteProjectContent) {
            notifyUnavailableDesktopApi();
            dispatch({ type: 'delete-content-completed', payload: NotificationError.DeleteContent });
            return;
          }

          try {
            state.projectProxy.replaceProject(await window.manticore.deleteProjectContent(project.path, ids));
            dispatch({ type: 'delete-content-completed' });
          } catch {
            dispatch({ type: 'delete-content-completed', payload: NotificationError.DeleteContent });
          }
          return;
        }
        default:
          break;
      }

      const result = await state.contentStrategies.get(assetType)?.handle(new ContentAction(id, action, data));

      if (!result) {
        return;
      }

      switch (result.action) {
          case 'delete-completed':
            dispatch({ type: 'delete-content-completed', payload: result.data.error });
            break;
          case 'open-new-content':
            dispatch({ type: 'new-content-dialog-opened', payload: result.data });
            break;
          case 'open-import-assets':
            dispatch({ type: 'import-assets-dialog-opened', payload: result.data.bundleId });
            break;
          case 'import-assets-completed': {
            const errors = result.data.filter(({ error }) => error);
            dispatch({ type: 'import-assets-completed', payload: errors });
            break;
          }
          case 'show-notification':
            dispatch({ type: 'notification-error-set', payload: result.data.error });
            break;
          default:
            break;
      }
    },
    [state.contentStrategies, state.project, state.projectProxy]
  );
  const handleShortcut = useCallback((shortcutId: KeyboardShortcutId) => {
    if (!state.project) return;

    const selectedItem = getSelectedProjectItem(state.project, state.selection);
    if (!selectedItem) return;

    const action = keyboardShortcuts.getAction(shortcutId, selectedItem.type);
    if (!action) return;

    void handleWorkingScreenAction(action, selectedItem.type, selectedItem.id);
  }, [handleWorkingScreenAction, state.project, state.selection]);
  useEffect(() => keyboardShortcuts.subscribe(handleShortcut), [handleShortcut]);

  const projectStructure = useMemo(() => ({
    expandedItemIds,
    onAction: handleWorkingScreenAction,
    project: state.project,
    selectedItems: state.selection,
    setExpandedItemIds
  }), [expandedItemIds, handleWorkingScreenAction, state.project, state.selection]);

  const handleCloseNotification = useCallback(
    () => dispatch({ type: 'notification-error-set', payload: NotificationError.None }),
    []
  );
  const modalData = useMemo(
    () => ({
      'delete-content': state.deleteContent,
      'import-asset': state.importAssetsDialog,
      'new-content': state.newContentDialog
    }),
    [state.deleteContent, state.importAssetsDialog, state.newContentDialog]
  );

  return {
    disabledItemIds: state.disabledItemIds,
    handleAction,
    handleCloseNotification,
    handleWorkingScreenAction,
    modalData,
    notificationError: state.notificationError,
    projectStructure,
    selectedActionIds
  };
};
