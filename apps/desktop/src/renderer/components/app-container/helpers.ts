import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { PROJECT_ITEM_CONFIG, ProjectItemId } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { ProjectProxy } from './ProjectProxy';
import type { AppContainerState } from './types';

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

const isExpandableItem = (id: number, projectProxy: ProjectProxy) => {
  const item = projectProxy.getItemById(id);
  return !!item && PROJECT_ITEM_CONFIG[item.type].expandable && projectProxy.hasChildren(id);
};

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
  const previousProject = state.projectProxy.project;
  const isCurrentProject = previousProject?.path === project.path;
  const content = project.content ?? [];
  const createdItems = isCurrentProject
    ? content.filter((item) => !previousProject.content?.some(({ id }) => id === item.id))
    : [];
  const createdItem = createdItems[0];
  const createdParentIds = createdItems.map(({ parentId }) => parentId);
  state.projectProxy.setProject(project);
  const expandedItemIds = new Set([...state.expandedItemIds, ...createdParentIds].filter((id) => isExpandableItem(id, state.projectProxy)));
  const visibleProjectItems = state.projectProxy.getVisibleProjectItems(expandedItemIds);

  return {
    ...state,
    expandedItemIds,
    visibleProjectItems,
    ...getProjectSelectionState(state, isCurrentProject, createdItem)
  };
};

export const getDeletableContent = (state: AppContainerState, assetType: AssetType, id: number) => {
  const selectedIds = state.selection.includes(id) ? state.selection : [id];
  const { projectProxy } = state;
  const selectedIdSet = new Set(selectedIds);
  const selectedItem = projectProxy.getItemById(id);
  if (!selectedItem || selectedItem.type !== assetType) return [];

  return selectedIds.reduce<typeof selectedItem[]>((items, selectedId) => {
    const item = projectProxy.getItemById(selectedId);
    if (!item || item.id === ProjectItemId.Project || item.id === ProjectItemId.RootFolder) {
      return items;
    }

    let parentId = item.parentId;
    while (parentId) {
      if (selectedIdSet.has(parentId)) return items;
      parentId = projectProxy.getItemById(parentId)?.parentId ?? ProjectItemId.Project;
    }

    items.push(item);
    return items;
  }, []);
};
