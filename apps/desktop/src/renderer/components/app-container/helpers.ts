import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { PROJECT_ITEM_CONFIG, ProjectItemId } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { AppContainerState, VisibleProjectItem } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const getNewContentState = (
  assetType: AssetType,
  isOpen: boolean,
  siblingNames: readonly string[] = []
): ModalPropsMap['new-content'] => ({ assetType, isOpen, siblingNames, type: 'new-content' });

export const updateModalData = <Key extends keyof ModalPropsMap>(
  prevData: ModalPropsMap,
  value: ModalPropsMap[Key]
): ModalPropsMap => ({ ...prevData, [value.type]: value });

export const getChildrenIds = (childrenIdsByParentId: ReadonlyMap<number, readonly number[]>, id: number) => childrenIdsByParentId.get(id) ?? [];
export const getVisibleProjectItems = (childrenIdsByParentId: ReadonlyMap<number, readonly number[]>, expandedItemIds: ReadonlySet<number>, parentId = ProjectItemId.RootFolder, depth = 0): VisibleProjectItem[] =>
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

export const projectChanged = (state: AppContainerState, project: ProjectInfo): AppContainerState => {
  const isCurrentProject = state.projectPath === project.path;
  const content = project.content ?? [];
  const createdItems = isCurrentProject
    ? content.filter((item) => !state.contentById.has(item.id))
    : [];
  const createdItem = createdItems[0];
  const createdParentIds = createdItems.map(({ parentId }) => parentId);
  const contentById = new Map(content.map((item) => [item.id, item]));
  const childrenIdsByParentId = new Map<number, number[]>();
  for (const { id, parentId } of contentById.values()) childrenIdsByParentId.set(parentId, [...getChildrenIds(childrenIdsByParentId, parentId), id]);
  const isFolder = (item: ProjectContent) => item.type === AssetType.ProjectFolder || item.type === AssetType.BundleFolder;
  childrenIdsByParentId.forEach((ids) => ids.sort((left, right) => {
    const leftItem = contentById.get(left)!;
    const rightItem = contentById.get(right)!;
    return Number(isFolder(rightItem)) - Number(isFolder(leftItem)) || leftItem.name.localeCompare(rightItem.name, undefined, { numeric: true, sensitivity: 'base' }) || left - right;
  }));
  const expandedItemIds = new Set([...state.expandedItemIds, ...createdParentIds].filter((id) => {
    const item = contentById.get(id);
    return !!item && PROJECT_ITEM_CONFIG[item.type].expandable && getChildrenIds(childrenIdsByParentId, id).length > 0;
  }));
  const visibleProjectItems = getVisibleProjectItems(childrenIdsByParentId, expandedItemIds);

  return {
    ...state,
    bundles: [...contentById.values()].filter(({ type }) => type === AssetType.Bundle),
    childrenIdsByParentId,
    contentById,
    currentProject: project,
    expandedItemIds,
    projectName: project.name,
    projectPath: project.path,
    visibleProjectItems,
    ...getProjectSelectionState(state, isCurrentProject, createdItem)
  };
};

export const getDeletableContent = (state: AppContainerState, assetType: AssetType, id: number) => {
  const selectedIds = state.selection.includes(id) ? state.selection : [id];
  const selectedIdSet = new Set(selectedIds);
  const selectedItem = state.contentById.get(id);
  if (!selectedItem || selectedItem.type !== assetType) return [];

  return selectedIds.reduce<typeof selectedItem[]>((items, selectedId) => {
    const item = state.contentById.get(selectedId);
    if (!item || item.id === ProjectItemId.Project || item.id === ProjectItemId.RootFolder) {
      return items;
    }

    let parentId = item.parentId;
    while (parentId) {
      if (selectedIdSet.has(parentId)) return items;
      parentId = state.contentById.get(parentId)?.parentId ?? ProjectItemId.Project;
    }

    items.push(item);
    return items;
  }, []);
};
