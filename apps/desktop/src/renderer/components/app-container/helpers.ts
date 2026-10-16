import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { PROJECT_ITEM_CONFIG } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { ProjectProxy } from './ProjectProxy';
import type { AppContainerState, VisibleProjectItem } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const getVisibleProjectItems = (
  projectProxy: ProjectProxy,
  expandedItemIds: ReadonlySet<number>,
  parentId = 0,
  depth = 0
): VisibleProjectItem[] => {
  const items: VisibleProjectItem[] = [];

  for (const id of projectProxy.getChildrenIds(parentId)) {
    items.push({ depth, id });
    if (expandedItemIds.has(id)) items.push(...getVisibleProjectItems(projectProxy, expandedItemIds, id, depth + 1));
  }

  return items;
};

export const getVisibleProjectItemIds = (
  projectProxy: ProjectProxy,
  expandedItemIds: ReadonlySet<number>
) => getVisibleProjectItems(projectProxy, expandedItemIds).map(({ id }) => id);

export const getNewContentState = (
  strategies: AppContainerState['contentStrategies'],
  assetType: AssetType,
  isOpen: boolean
): ModalPropsMap['new-content'] => ({ isOpen, strategy: strategies.get(assetType)!, type: 'new-content' });

export const updateModalData = <Key extends keyof ModalPropsMap>(
  prevData: ModalPropsMap,
  value: ModalPropsMap[Key]
): ModalPropsMap => ({ ...prevData, [value.type]: value });

const isExpandableItem = (id: number, projectProxy: ProjectProxy) => {
  const item = projectProxy.getContent(id);
  return !!item && PROJECT_ITEM_CONFIG[item.type].expandable && projectProxy.hasChildren(id);
};

const getProjectSelectionState = (
  state: Pick<AppContainerState, 'selection' | 'selectionAnchor'>,
  isCurrentProject: boolean,
  createdItem?: ProjectContent
) => {
  if (createdItem) return { selection: [createdItem.id], selectionAnchor: createdItem.id };
  return isCurrentProject ? { selection: state.selection, selectionAnchor: state.selectionAnchor } : { selection: [], selectionAnchor: null };
};

export const projectChanged = (state: AppContainerState, project: ProjectInfo): AppContainerState => {
  const previousProject = state.projectProxy.project;
  const isCurrentProject = previousProject?.path === project.path;
  const content = project.content ?? [];
  const createdItems = isCurrentProject
    ? content.filter((item) => !previousProject.content?.some(({ id }) => id === item.id))
    : [];
  const createdItem = createdItems[0];
  const createdParentIds = createdItems.map(({ parentId }) => parentId);
  const expandedItemCandidates = state.expandedItemIds.concat(createdParentIds);
  state.projectProxy.setProject(project);
  const expandedItemIds = expandedItemCandidates.filter((id) => isExpandableItem(id, state.projectProxy));
  const visibleProjectItemIds = getVisibleProjectItemIds(state.projectProxy, new Set(expandedItemIds));

  return {
    ...state,
    expandedItemIds,
    visibleProjectItemIds,
    ...getProjectSelectionState(state, isCurrentProject, createdItem)
  };
};

export const getDeletableContent = (state: AppContainerState, assetType: AssetType, id: number) => {
  const selectedIds = state.selection.includes(id) ? state.selection : [id];
  const { projectProxy } = state;
  const selectedIdSet = new Set(selectedIds);
  const selectedItem = projectProxy.getContent(id);
  if (!selectedItem || selectedItem.type !== assetType) return [];

  return selectedIds.reduce<typeof selectedItem[]>((items, selectedId) => {
    const item = projectProxy.getContent(selectedId);
    if (!item || item.type === AssetType.Project || (item.type === AssetType.ProjectFolder && item.parentId === 0)) {
      return items;
    }

    let parentId = item.parentId;
    while (parentId) {
      if (selectedIdSet.has(parentId)) return items;
      parentId = projectProxy.getContent(parentId)?.parentId ?? 0;
    }

    items.push(item);
    return items;
  }, []);
};
