import { AssetType } from '../../../types';

import type { ProjectInfo, RestoredProject } from '../../types';

import type { ImportAssetResult } from './common';
import { DEFAULT_DELETE_CONTENT, DEFAULT_IMPORT_ASSETS_DIALOG, LAST_INDEX, NotificationError } from './constants';
import { ProjectProxy } from './ProjectProxy';
import {
  getDeletableContent,
  getNewContentState,
  getProjectTreeRootNodes,
  getVisibleProjectTreeItems,
  projectChanged,
  reducerAction,
  updateModalData
} from './helpers';
import { CONTENT_STRATEGY_CONSTRUCTORS, type ContentStrategy, type OpenNewContentData } from './strategies';
import type {
  AppContainerAction,
  AppContainerState,
  ReducerActionHandler,
  WorkingScreenActionPayload
} from './types';

export const createInitialAppContainerState = (): AppContainerState => {
  const projectProxy = new ProjectProxy();
  const contentStrategies = CONTENT_STRATEGY_CONSTRUCTORS.reduce<Map<AssetType, ContentStrategy>>(
    (strategies, [assetType, Strategy]) => strategies.set(assetType, new Strategy(projectProxy)),
    new Map()
  );
  return {
    bundles: [],
    contentById: new Map(),
    contentStrategies,
    disabledItemIds: [],
    expandedItemIds: [],
    modalData: {
      'delete-content': DEFAULT_DELETE_CONTENT,
      'import-asset': DEFAULT_IMPORT_ASSETS_DIALOG,
      'new-content': getNewContentState(contentStrategies, AssetType.ProjectFolder, false)
    },
    notificationError: NotificationError.None,
    project: null,
    projectProxy,
    selectionAnchor: null,
    selection: []
  };
};

const REDUCER_ACTIONS = new Map<AppContainerAction['type'], ReducerActionHandler>([
  ['create-project', (state) => ({
    ...state,
    modalData: updateModalData(state.modalData, getNewContentState(state.contentStrategies, AssetType.Project, true))
  })],
  ['delete-completed', reducerAction<{ error?: NotificationError }>((state, { error }) => ({
    ...state,
    modalData: updateModalData(state.modalData, DEFAULT_DELETE_CONTENT),
    notificationError: error ?? state.notificationError,
    selection: [],
    selectionAnchor: null
  }))],
  ['open-delete-modal', reducerAction<WorkingScreenActionPayload>((state, { assetType, id }) => {
    const items = getDeletableContent(state, assetType, id);

    return items.length
      ? {
          ...state,
          modalData: updateModalData(state.modalData, { isOpen: true, items, type: 'delete-content' }),
          selection: items.map((item) => item.id)
        }
      : state;
  })],
  ['close-delete-modal', (state) => ({
    ...state,
    modalData: updateModalData(state.modalData, DEFAULT_DELETE_CONTENT)
  })],
  ['expanded-item-toggled', reducerAction<number>((state, id) => ({
    ...state,
    expandedItemIds: state.expandedItemIds.includes(id)
      ? state.expandedItemIds.filter((expandedId) => expandedId !== id)
      : state.expandedItemIds.concat(id)
  }))],
  ['open-import-assets', reducerAction<{ bundleId: number | null }>((state, { bundleId }) => {
    const selectedBundle = state.bundles.find((bundle) => bundle.id === bundleId) ?? state.bundles[0];

    return selectedBundle
      ? {
          ...state,
          modalData: updateModalData(state.modalData, {
            bundleId: selectedBundle.id,
            bundles: state.bundles,
            errors: [],
            isOpen: true,
            type: 'import-asset'
          })
        }
      : { ...state, notificationError: NotificationError.ContentTypeUnavailable };
  })],
  ['close-import-assets-dialog', (state) => ({
    ...state,
    modalData: updateModalData(state.modalData, DEFAULT_IMPORT_ASSETS_DIALOG)
  })],
  ['import-assets-completed', reducerAction<readonly ImportAssetResult[]>((state, results) => {
    const errors = results.filter(({ error }) => error);

    return {
      ...state,
      modalData: updateModalData(
        state.modalData,
        errors.length ? { ...state.modalData['import-asset'], errors } : DEFAULT_IMPORT_ASSETS_DIALOG
      )
    };
  })],
  ['open-new-content', reducerAction<OpenNewContentData>((state, data) => {
    const strategy = state.contentStrategies.get(data.assetType);
    if (!strategy) return { ...state, notificationError: NotificationError.ContentTypeUnavailable };

    try {
      strategy.setFields(data.fields);
      const modalData = updateModalData(state.modalData, getNewContentState(state.contentStrategies, data.assetType, true));

      return { ...state, modalData };
    } catch {
      return { ...state, notificationError: NotificationError.ContentConfiguration };
    }
  })],
  ['close-new-content-dialog', (state) => {
    state.modalData['new-content'].strategy.setField('parentPath', '');
    const modalData = updateModalData(state.modalData, getNewContentState(state.contentStrategies, AssetType.ProjectFolder, false));
    return { ...state, modalData };
  }],
  ['show-notification', reducerAction<{ error: NotificationError }>((state, { error: notificationError }) => ({
    ...state,
    notificationError
  }))],
  ['project-changed', reducerAction<ProjectInfo>(projectChanged)],
  ['restore-project-completed', reducerAction<RestoredProject>((state, { error, project }) =>
    project
      ? projectChanged(state, project)
      : { ...state, notificationError: error ? NotificationError.RestoreProject : NotificationError.None }
  )],
  ['selection-cleared', (state) => ({ ...state, selection: [], selectionAnchor: null })],
  ['select', reducerAction<WorkingScreenActionPayload>((state, { data }) => {
    const { id, isExtended, isRange } = data as { id: number; isExtended: boolean; isRange: boolean };
    const { rootNodes } = getProjectTreeRootNodes(state.project?.content ?? []);
    const rangeIds = isRange
      ? [0, ...getVisibleProjectTreeItems(rootNodes, new Set(state.expandedItemIds)).map(({ node }) => node.item.id)]
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
  })]
]);

export const appContainerReducer = (state: AppContainerState, { payload, type }: AppContainerAction): AppContainerState =>
  REDUCER_ACTIONS.get(type)?.(state, payload) ?? state;
