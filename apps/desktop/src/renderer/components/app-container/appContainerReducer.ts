import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { DEFAULT_DELETE_CONTENT, getDefaultImportAssetsDialog, LAST_INDEX, NotificationError, ProjectItemId } from './constants';
import {
  assertUnreachable,
  contentAdded,
  contentDeleted,
  contentRelocated,
  getBundles,
  getChildrenIds,
  getDeletableContent,
  getNewContentState,
  getVisibleProjectItems,
  isSelectionData,
  projectLoaded,
  updateModalData
} from './helpers';
import type { AppContainerAction, AppContainerState } from './types';

export const INITIAL_APP_CONTAINER_STATE: AppContainerState = {
    activeModalType: '',
    bundleIds: [],
    childrenIdsByParentId: { [ProjectItemId.Project]: [], [ProjectItemId.RootFolder]: [] },
    contentById: {},
    disabledItemIds: [],
    expandedItemIds: new Set(),
    modalData: {
      'delete-content': DEFAULT_DELETE_CONTENT,
      'import-asset': getDefaultImportAssetsDialog([]),
      'new-content': getNewContentState(AssetType.ProjectFolder, false)
    },
    notificationError: NotificationError.None,
    projectName: '',
    projectPath: '',
    selectionAnchor: ProjectItemId.Empty,
    selection: [],
    visibleProjectItems: []
};

export const appContainerReducer = (state: AppContainerState, action: AppContainerAction): AppContainerState => {
  switch (action.type) {
  case 'content-created':
    return contentAdded(state, [action.payload.data as ProjectContent]);
  case 'content-updated':
    {
      const previousContent = state.contentById[action.payload.id];
      if (previousContent?.parentId !== action.payload.parentId) return contentRelocated(state, action.payload);

      const contentById = { ...state.contentById, [action.payload.id]: action.payload };
      return {
        ...state,
        contentById
      };
    }
  case 'create-project':
    return {
    ...state,
    activeModalType: 'new-content',
    modalData: updateModalData(state.modalData, getNewContentState(AssetType.Project, true))
    };
  case 'delete-completed': {
    const { deletedIds, error } = action.payload;
    const nextState = deletedIds ? contentDeleted(state, deletedIds) : state;
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
  case 'expanded-item-toggled': {
    const { id } = action.payload;
    const expandedItemIds = new Set(state.expandedItemIds);
    if (expandedItemIds.has(id)) expandedItemIds.delete(id);
    else expandedItemIds.add(id);
    return {
    ...state,
    expandedItemIds,
    visibleProjectItems: getVisibleProjectItems(state.childrenIdsByParentId, expandedItemIds)
    };
  }
  case 'open-import-assets': {
    const { bundleId } = action.payload;
    const selectedBundleId = state.bundleIds.includes(bundleId) ? bundleId : state.bundleIds[0] ?? ProjectItemId.Empty;

    return selectedBundleId !== ProjectItemId.Empty
      ? {
          ...state,
          activeModalType: 'import-asset',
          modalData: updateModalData(state.modalData, {
            bundleId: selectedBundleId,
            errors: [],
            isOpen: true,
            bundles: getBundles(state),
            type: 'import-asset'
          })
        }
      : { ...state, notificationError: NotificationError.ContentTypeUnavailable };
  }
  case 'import-assets-completed': {
    const results = action.payload;
    const errors = results.filter(({ error }) => error);
    const assets = results.flatMap(({ asset }) => asset ? [asset] : []);
    const nextState = assets.length
      ? contentAdded(state, assets)
      : state;

    return {
      ...nextState,
      modalData: updateModalData(
        nextState.modalData,
        errors.length ? { ...nextState.modalData['import-asset'], errors } : getDefaultImportAssetsDialog(getBundles(nextState))
      )
    };
  }
  case 'open-new-content': {
    const data = action.payload;
    const siblingNames = getChildrenIds(state.childrenIdsByParentId, data.fields.parentId).map((id) => state.contentById[id]!.name);
    const modalData = updateModalData(state.modalData, getNewContentState(data.assetType, true, siblingNames, data.fields));
    return { ...state, activeModalType: 'new-content', modalData };
  }
  case 'close-modal': {
    let modalData;
    switch (action.payload.data) {
      case 'delete-content':
        modalData = DEFAULT_DELETE_CONTENT;
        break;
      case 'import-asset':
        modalData = getDefaultImportAssetsDialog(getBundles(state));
        break;
      case 'new-content':
        modalData = getNewContentState(AssetType.ProjectFolder, false);
        break;
      default:
        return state;
    }
    return { ...state, activeModalType: '', modalData: updateModalData(state.modalData, modalData) };
  }
  case 'show-notification': {
    const { error: notificationError } = action.payload;
    return {
    ...state,
    notificationError
    };
  }
  case 'project-opened':
    return projectLoaded(state, action.payload.data as ProjectInfo);
  case 'project-renamed':
    return { ...state, projectName: action.payload };
  case 'restore-project-completed': {
    const { error, project } = action.payload;
    return project
      ? projectLoaded(state, project)
      : { ...state, notificationError: error ? NotificationError.RestoreProject : NotificationError.None };
  }
  case 'selection-cleared':
    return { ...state, selection: [], selectionAnchor: ProjectItemId.Empty };
  case 'select': {
    if (!isSelectionData(action.payload.data)) return state;

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
