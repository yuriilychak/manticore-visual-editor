import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { FOLDER_TYPES, PROJECT_ITEM_CONFIG, ProjectItemId } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { AppContainerState, NewContentContext, VisibleProjectItem } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const getNewContentState = (
  assetType: AssetType,
  isOpen: boolean,
  siblingNames: readonly string[] = [],
  context: NewContentContext = {}
): ModalPropsMap['new-content'] => ({ assetType, context, isOpen, siblingNames, type: 'new-content' });

export const updateModalData = <Key extends keyof ModalPropsMap>(
  prevData: ModalPropsMap,
  value: ModalPropsMap[Key]
): ModalPropsMap => ({ ...prevData, [value.type]: value });

export const getBundles = (state: Pick<AppContainerState, 'bundleIds' | 'contentById'>) =>
  state.bundleIds.reduce<ProjectContent[]>((bundles, id) => {
    const bundle = state.contentById[id];
    if (bundle) bundles.push(bundle);
    return bundles;
  }, []);

export const isSelectionData = (data: unknown): data is { id: number; isExtended: boolean; isRange: boolean } =>
  typeof data === 'object' && data !== null
  && typeof (data as { id?: unknown }).id === 'number'
  && typeof (data as { isExtended?: unknown }).isExtended === 'boolean'
  && typeof (data as { isRange?: unknown }).isRange === 'boolean';

export const assertUnreachable = (action: never): never => {
  throw new Error(`Unknown app-container action: ${JSON.stringify(action)}`);
};

export const getChildrenIds = (childrenIdsByParentId: Readonly<Record<number, readonly number[]>>, id: number) => {
  const childIds = childrenIdsByParentId[id];
  if (!childIds) throw new Error(`Children for project item ${id} are missing.`);
  return childIds;
};
export const getIsFolder = (item: ProjectContent) => FOLDER_TYPES.has(item.type);
export const updateChildrenIds = (
  childrenIdsByParentId: Record<number, readonly number[]>,
  contentById: Readonly<Record<number, ProjectContent>>,
  parentId: number,
  addedIds: readonly number[]
) => {
  const currentIds = getChildrenIds(childrenIdsByParentId, parentId);
  const childIds = [...new Set([...currentIds, ...addedIds])];

  childIds.sort((left, right) => {
    const leftItem = contentById[left]!;
    const rightItem = contentById[right]!;

    return Number(getIsFolder(rightItem)) - Number(getIsFolder(leftItem)) || leftItem.name.localeCompare(rightItem.name, undefined, { numeric: true, sensitivity: 'base' }) || left - right;
  });
  childrenIdsByParentId[parentId] = childIds;
};

export const getVisibleProjectItems = (childrenIdsByParentId: Readonly<Record<number, readonly number[]>>, expandedItemIds: ReadonlySet<number>, parentId = ProjectItemId.RootFolder, depth = 0): VisibleProjectItem[] =>
  getChildrenIds(childrenIdsByParentId, parentId).flatMap((id) => [
    { depth, id },
    ...(expandedItemIds.has(id) ? getVisibleProjectItems(childrenIdsByParentId, expandedItemIds, id, depth + 1) : [])
  ]);

const getProjectSelectionState = (
  state: Pick<AppContainerState, 'selection' | 'selectionAnchor'>,
  isCurrentProject: boolean,
  createdItem?: ProjectContent
) => {
  if (createdItem) return { selection: [createdItem.id], selectionAnchor: createdItem.id };
  return isCurrentProject
    ? { selection: state.selection, selectionAnchor: state.selectionAnchor }
    : { selection: [], selectionAnchor: ProjectItemId.Empty };
};

export const projectLoaded = (state: AppContainerState, project: ProjectInfo): AppContainerState => {
  const isCurrentProject = state.projectPath === project.path;
  const content = project.content ?? [];
  const createdItems = isCurrentProject
    ? content.filter((item) => !state.contentById[item.id])
    : [];
  const createdItem = createdItems[0];
  const createdParentIds = createdItems.map(({ parentId }) => parentId);
  const contentById = Object.fromEntries(content.map((item) => [item.id, item]));
  const childrenIdsByParentId: Record<number, number[]> = {
    [ProjectItemId.Project]: [],
    [ProjectItemId.RootFolder]: []
  };
  const idsByParentId = new Map<number, number[]>();
  for (const { id, parentId } of Object.values(contentById)) {
    childrenIdsByParentId[id] ??= [];
    idsByParentId.set(parentId, [...(idsByParentId.get(parentId) ?? []), id]);
  }
  idsByParentId.forEach((ids, parentId) => updateChildrenIds(childrenIdsByParentId, contentById, parentId, ids));
  const expandedItemIds = new Set([...state.expandedItemIds, ...createdParentIds].filter((id) => {
    const item = contentById[id];
    return !!item && PROJECT_ITEM_CONFIG[item.type].expandable && getChildrenIds(childrenIdsByParentId, id).length > 0;
  }));
  const visibleProjectItems = getVisibleProjectItems(childrenIdsByParentId, expandedItemIds);

  return {
    ...state,
    bundleIds: Object.values(contentById).reduce<number[]>((ids, { id, type }) => {
      if (type === AssetType.Bundle) ids.push(id);
      return ids;
    }, []),
    childrenIdsByParentId,
    contentById,
    expandedItemIds,
    projectName: project.name,
    projectPath: project.path,
    visibleProjectItems,
    ...getProjectSelectionState(state, isCurrentProject, createdItem)
  };
};

export const contentAdded = (state: AppContainerState, content: readonly ProjectContent[]): AppContainerState => {
  if (!content.length) return state;

  const contentById = { ...state.contentById };
  const childrenIdsByParentId = { ...state.childrenIdsByParentId };
  const addedIdsByParentId = new Map<number, Set<number>>();
  for (const item of content) {
    contentById[item.id] = item;
    childrenIdsByParentId[item.id] ??= [];
    const ids = addedIdsByParentId.get(item.parentId) ?? new Set<number>();
    ids.add(item.id);
    addedIdsByParentId.set(item.parentId, ids);
  }

  for (const [parentId, addedIds] of addedIdsByParentId) {
    updateChildrenIds(childrenIdsByParentId, contentById, parentId, [...addedIds]);
  }

  const expandedItemIds = new Set([...state.expandedItemIds, ...addedIdsByParentId.keys()].filter((id) => {
    const item = contentById[id];
    return !!item && PROJECT_ITEM_CONFIG[item.type].expandable && getChildrenIds(childrenIdsByParentId, id).length > 0;
  }));
  const addedBundleIds = content.filter(({ type }) => type === AssetType.Bundle).map(({ id }) => id);
  const createdItem = content[0]!;
  return {
    ...state,
    bundleIds: addedBundleIds.length ? state.bundleIds.concat(addedBundleIds) : state.bundleIds,
    childrenIdsByParentId,
    contentById,
    expandedItemIds,
    selection: [createdItem.id],
    selectionAnchor: createdItem.id,
    visibleProjectItems: getVisibleProjectItems(childrenIdsByParentId, expandedItemIds)
  };
};

export const contentRelocated = (state: AppContainerState, content: ProjectContent): AppContainerState => {
  const previousContent = state.contentById[content.id];
  if (!previousContent) return state;

  const contentById = { ...state.contentById, [content.id]: content };
  const childrenIdsByParentId = { ...state.childrenIdsByParentId };
  const previousChildIds = getChildrenIds(childrenIdsByParentId, previousContent.parentId).filter((id) => id !== content.id);
  updateChildrenIds(childrenIdsByParentId, contentById, content.parentId, [content.id]);
  childrenIdsByParentId[previousContent.parentId] = previousChildIds;

  return {
    ...state,
    childrenIdsByParentId,
    contentById,
    visibleProjectItems: getVisibleProjectItems(childrenIdsByParentId, state.expandedItemIds)
  };
};

export const contentDeleted = (state: AppContainerState, deletedIds: readonly number[]): AppContainerState => {
  const deletedIdSet = new Set(deletedIds);
  const contentById = Object.fromEntries(Object.entries(state.contentById).filter(([id]) => !deletedIdSet.has(Number(id))));
  const childrenIdsByParentId = Object.fromEntries(
    Object.entries(state.childrenIdsByParentId)
      .filter(([id]) => !deletedIdSet.has(Number(id)))
      .map(([id, childIds]) => [id, childIds.filter((childId) => !deletedIdSet.has(childId))])
  );
  const expandedItemIds = new Set([...state.expandedItemIds].filter((id) => !deletedIdSet.has(id)));
  return {
    ...state,
    bundleIds: state.bundleIds.filter((id) => !deletedIdSet.has(id)),
    childrenIdsByParentId,
    contentById,
    expandedItemIds,
    visibleProjectItems: getVisibleProjectItems(childrenIdsByParentId, expandedItemIds)
  };
};

export const getDeletableContent = (state: AppContainerState, assetType: AssetType, id: number) => {
  const selectedIds = state.selection.includes(id) ? state.selection : [id];
  const selectedIdSet = new Set(selectedIds);
  const selectedItem = state.contentById[id];
  if (!selectedItem || selectedItem.type !== assetType) return [];

  return selectedIds.reduce<typeof selectedItem[]>((items, selectedId) => {
    const item = state.contentById[selectedId];
    if (!item || item.id === ProjectItemId.Project || item.id === ProjectItemId.RootFolder) {
      return items;
    }

    let parentId = item.parentId;
    while (parentId) {
      if (selectedIdSet.has(parentId)) return items;
      parentId = state.contentById[parentId]?.parentId ?? ProjectItemId.Project;
    }

    items.push(item);
    return items;
  }, []);
};
