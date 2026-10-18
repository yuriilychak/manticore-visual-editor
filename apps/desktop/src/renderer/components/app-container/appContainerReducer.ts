import { AssetType } from '../../../types';

import { DEFAULT_DELETE_CONTENT, getDefaultImportAssetsDialog, LAST_INDEX, NotificationError, ProjectItemId } from './constants';
import {
  getDeletableContent,
  getNewContentState,
  projectChanged,
  updateModalData
} from './helpers';
import { ProjectProxy } from './ProjectProxy';
import type { AppContainerAction, AppContainerState } from './types';

export const createInitialAppContainerState = (): AppContainerState => {
  const projectProxy = new ProjectProxy();
  return {
    activeModalType: '',
    disabledItemIds: [],
    expandedItemIds: new Set(),
    modalData: {
      'delete-content': DEFAULT_DELETE_CONTENT,
      'import-asset': getDefaultImportAssetsDialog(projectProxy),
      'new-content': getNewContentState(AssetType.ProjectFolder, false)
    },
    notificationError: NotificationError.None,
    projectName: '',
    projectPath: '',
    projectProxy,
    selectionAnchor: ProjectItemId.Empty,
    selection: [],
    visibleProjectItems: []
  };
};

const assertUnreachable = (action: never): never => {
  throw new Error(`Unknown app-container action: ${JSON.stringify(action)}`);
};

export const appContainerReducer = (state: AppContainerState, action: AppContainerAction): AppContainerState => {
  switch (action.type) {
  case 'content-created':
    state.projectProxy.addContent(action.payload);
    return state;
  case 'content-updated':
    state.projectProxy.moveContent(action.payload.id, action.payload);
    return state;
  case 'create-project':
    return {
    ...state,
    activeModalType: 'new-content',
    modalData: updateModalData(state.modalData, getNewContentState(AssetType.Project, true))
    };
  case 'delete-completed': {
    const { error, project } = action.payload;
    const nextState = project ? projectChanged(state, project) : state;
    return {
    ...nextState,
    activeModalType: '',
    modalData: updateModalData(state.modalData, DEFAULT_DELETE_CONTENT),
    notificationError: error ?? state.notificationError,
    selection: [],
    selectionAnchor: ProjectItemId.Empty
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
    const expandedItemIds = new Set(state.expandedItemIds);
    if (expandedItemIds.has(id)) expandedItemIds.delete(id);
    else expandedItemIds.add(id);
    return {
    ...state,
    expandedItemIds,
    visibleProjectItems: state.projectProxy.getVisibleProjectItems(expandedItemIds)
    };
  }
  case 'open-import-assets': {
    const { bundleId } = action.payload;
    const { projectProxy } = state;
    const selectedBundleId = projectProxy.getSelectedBundleId(bundleId);

    return selectedBundleId !== ProjectItemId.Empty
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
    results.forEach(({ asset }) => {
      if (asset) state.projectProxy.addContent(asset);
    });

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
    const siblingNames = state.projectProxy.getNamesAtParentId(data.fields.parentId);
    const modalData = updateModalData(state.modalData, getNewContentState(data.assetType, true, siblingNames));
    return { ...state, activeModalType: 'new-content', modalData };
  }
  case 'close-new-content-dialog': {
    const modalData = updateModalData(state.modalData, getNewContentState(AssetType.ProjectFolder, false));
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
  case 'project-created':
    state.projectProxy.replaceProject(action.payload);
    return { ...state, projectName: action.payload.name, projectPath: action.payload.path };
  case 'project-renamed':
    state.projectProxy.renameProject(action.payload);
    return { ...state, projectName: action.payload };
  case 'restore-project-completed': {
    const { error, project } = action.payload;
    return project
      ? projectChanged(state, project)
      : { ...state, notificationError: error ? NotificationError.RestoreProject : NotificationError.None };
  }
  case 'selection-cleared':
    return { ...state, selection: [], selectionAnchor: ProjectItemId.Empty };
  case 'select': {
    const { id, isExtended, isRange } = action.payload.data;
    const rangeIds = isRange
      ? [ProjectItemId.Project, ...state.visibleProjectItems.map(({ id }) => id)]
      : [];
    const isRangeSelection = rangeIds.includes(id);
    const anchor = state.selectionAnchor === ProjectItemId.Empty ? state.selection.at(LAST_INDEX) ?? id : state.selectionAnchor;
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
