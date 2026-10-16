import { AssetType } from '../../../types';

import { DEFAULT_DELETE_CONTENT, getDefaultImportAssetsDialog, LAST_INDEX, NO_BUNDLE_ID, NotificationError } from './constants';
import {
  getDeletableContent,
  getNewContentState,
  getVisibleProjectItemIds,
  projectChanged,
  updateModalData
} from './helpers';
import { ProjectProxy } from './ProjectProxy';
import { CONTENT_STRATEGY_CONSTRUCTORS, type ContentStrategy } from './strategies';
import type { AppContainerAction, AppContainerState } from './types';

export const createInitialAppContainerState = (): AppContainerState => {
  const projectProxy = new ProjectProxy();
  const contentStrategies = CONTENT_STRATEGY_CONSTRUCTORS.reduce<Map<AssetType, ContentStrategy>>(
    (strategies, [assetType, Strategy]) => strategies.set(assetType, new Strategy(projectProxy)),
    new Map()
  );
  return {
    activeModalType: '',
    contentStrategies,
    disabledItemIds: [],
    expandedItemIds: [],
    modalData: {
      'delete-content': DEFAULT_DELETE_CONTENT,
      'import-asset': getDefaultImportAssetsDialog(projectProxy),
      'new-content': getNewContentState(contentStrategies, AssetType.ProjectFolder, false)
    },
    notificationError: NotificationError.None,
    projectProxy,
    selectionAnchor: null,
    selection: [],
    visibleProjectItemIds: []
  };
};

const assertUnreachable = (action: never): never => {
  throw new Error(`Unknown app-container action: ${JSON.stringify(action)}`);
};

export const appContainerReducer = (state: AppContainerState, action: AppContainerAction): AppContainerState => {
  switch (action.type) {
  case 'create-project':
    return {
    ...state,
    activeModalType: 'new-content',
    modalData: updateModalData(state.modalData, getNewContentState(state.contentStrategies, AssetType.Project, true))
    };
  case 'delete-completed': {
    const { error } = action.payload;
    return {
    ...state,
    activeModalType: '',
    modalData: updateModalData(state.modalData, DEFAULT_DELETE_CONTENT),
    notificationError: error ?? state.notificationError,
    selection: [],
    selectionAnchor: null
    };
  }
  case 'open-delete-modal': {
    const { assetType, id } = action.payload;
    const items = getDeletableContent(state, assetType, id);

    return items.length
      ? {
          ...state,
          activeModalType: 'delete-content',
          modalData: updateModalData(state.modalData, { isOpen: true, items, type: 'delete-content' }),
          selection: items.map((item) => item.id)
        }
      : state;
  }
  case 'close-delete-modal':
    return {
    ...state,
    activeModalType: '',
    modalData: updateModalData(state.modalData, DEFAULT_DELETE_CONTENT)
    };
  case 'expanded-item-toggled': {
    const id = action.payload;
    const expandedItemIds = state.expandedItemIds.includes(id)
      ? state.expandedItemIds.filter((expandedId) => expandedId !== id)
      : state.expandedItemIds.concat(id);
    return {
    ...state,
    expandedItemIds,
    visibleProjectItemIds: getVisibleProjectItemIds(state.projectProxy, new Set(expandedItemIds))
    };
  }
  case 'open-import-assets': {
    const { bundleId } = action.payload;
    const { projectProxy } = state;
    const selectedBundleId = projectProxy.getSelectedBundleId(bundleId);

    return selectedBundleId !== NO_BUNDLE_ID
      ? {
          ...state,
          activeModalType: 'import-asset',
          modalData: updateModalData(state.modalData, {
            bundleId: selectedBundleId,
            errors: [],
            isOpen: true,
            projectProxy,
            type: 'import-asset'
          })
        }
      : { ...state, notificationError: NotificationError.ContentTypeUnavailable };
  }
  case 'close-import-assets-dialog':
    return {
    ...state,
    activeModalType: '',
    modalData: updateModalData(state.modalData, getDefaultImportAssetsDialog(state.projectProxy))
    };
  case 'import-assets-completed': {
    const results = action.payload;
    const errors = results.filter(({ error }) => error);

    return {
      ...state,
      modalData: updateModalData(
        state.modalData,
        errors.length ? { ...state.modalData['import-asset'], errors } : getDefaultImportAssetsDialog(state.projectProxy)
      )
    };
  }
  case 'open-new-content': {
    const data = action.payload;
    const strategy = state.contentStrategies.get(data.assetType);
    if (!strategy) return { ...state, notificationError: NotificationError.ContentTypeUnavailable };

    try {
      strategy.setFields(data.fields);
      const modalData = updateModalData(state.modalData, getNewContentState(state.contentStrategies, data.assetType, true));

      return { ...state, activeModalType: 'new-content', modalData };
    } catch {
      return { ...state, notificationError: NotificationError.ContentConfiguration };
    }
  }
  case 'close-new-content-dialog': {
    state.modalData['new-content'].strategy.setField('parentPath', '');
    const modalData = updateModalData(state.modalData, getNewContentState(state.contentStrategies, AssetType.ProjectFolder, false));
    return { ...state, activeModalType: '', modalData };
  }
  case 'show-notification': {
    const { error: notificationError } = action.payload;
    return {
    ...state,
    notificationError
    };
  }
  case 'project-changed':
    return projectChanged(state, action.payload);
  case 'restore-project-completed': {
    const { error, project } = action.payload;
    return project
      ? projectChanged(state, project)
      : { ...state, notificationError: error ? NotificationError.RestoreProject : NotificationError.None };
  }
  case 'selection-cleared':
    return { ...state, selection: [], selectionAnchor: null };
  case 'select': {
    const { id, isExtended, isRange } = action.payload.data;
    const rangeIds = isRange
      ? [0, ...state.visibleProjectItemIds]
      : [];
    const isRangeSelection = rangeIds.includes(id);
    const anchor = state.selectionAnchor ?? state.selection.at(LAST_INDEX) ?? id;
    const start = isRangeSelection ? rangeIds.indexOf(anchor) : LAST_INDEX;
    const end = isRangeSelection ? rangeIds.indexOf(id) : LAST_INDEX;
    const range = start === LAST_INDEX || end === LAST_INDEX
      ? [id]
      : rangeIds.slice(Math.min(start, end), Math.max(start, end) + 1);
    const selection = isRangeSelection
      ? Array.from(new Set(state.selection.concat(range)))
      : isExtended
      ? state.selection.includes(id)
        ? state.selection.filter((item) => item !== id)
        : state.selection.concat(id)
      : [id];

    return { ...state, selection, selectionAnchor: isRangeSelection ? anchor : id };
  }
  default:
    return assertUnreachable(action);
  }
};
