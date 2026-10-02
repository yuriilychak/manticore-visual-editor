import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProjectActionHandler } from '../../../types';

import type { ApplicationAction } from '../../types';

import { appContainerReducer, createInitialAppContainerState } from './appContainerReducer';
import { ContentAction } from './common';
import { NotificationError, SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { notifyUnavailableDesktopApi } from './strategies/helpers';

export const useAppContainer = () => {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appContainerReducer, undefined, createInitialAppContainerState);
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
    [state.contentStrategies]
  );

  const projectStructure = useMemo(() => ({
    onAction: handleWorkingScreenAction,
    project: state.project,
    selectedItems: state.selection
  }), [handleWorkingScreenAction, state.project, state.selection]);

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
