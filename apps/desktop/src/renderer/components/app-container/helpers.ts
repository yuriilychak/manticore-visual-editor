import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { PROJECT_ITEM_CONFIG } from './constants';
import type { ModalPropsMap } from './modal-types';
import type { AppContainerState, ProjectTree, ProjectTreeNode, VisibleProjectTreeItem } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const getVisibleProjectTreeItems = (
  nodes: readonly ProjectTreeNode[],
  expandedItemIds: ReadonlySet<number>,
  depth = 0
): VisibleProjectTreeItem[] => {
  const items: VisibleProjectTreeItem[] = [];

  for (const node of nodes) {
    items.push({ depth, node });
    if (expandedItemIds.has(node.item.id)) items.push(...getVisibleProjectTreeItems(node.children, expandedItemIds, depth + 1));
  }

  return items;
};

const isFolder = (item: ProjectContent) => item.type === AssetType.ProjectFolder || item.type === AssetType.BundleFolder;
const compareTreeNodes = (left: ProjectTreeNode, right: ProjectTreeNode) => {
  const folderOrder = Number(isFolder(right.item)) - Number(isFolder(left.item));
  if (folderOrder) return folderOrder;

  return left.item.name.localeCompare(right.item.name, undefined, { numeric: true, sensitivity: 'base' }) || left.item.id - right.item.id;
};

export const getProjectTree = (content: ProjectContent[]): ProjectTreeNode[] => {
  const nodes = new Map<number, ProjectTreeNode>(content.map((item) => [item.id, { children: [], item }]));
  const roots: ProjectTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = nodes.get(node.item.parentId);
    if (!parent || parent === node) roots.push(node);
    else parent.children.push(node);
  }

  roots.sort(compareTreeNodes);
  for (const node of nodes.values()) node.children.sort(compareTreeNodes);

  return roots;
};

export const getProjectTreeRootNodes = (content: ProjectContent[]): ProjectTree => {
  const projectTree = getProjectTree(content);
  const rootFolder = projectTree.find(
    (node) => node.item.type === AssetType.ProjectFolder && node.item.parentId === 0 && !node.item.name
  );

  return {
    rootFolder,
    rootNodes: rootFolder ? rootFolder.children.concat(projectTree.filter((node) => node !== rootFolder)) : projectTree
  };
};

export const getNewContentState = (
  strategies: AppContainerState['contentStrategies'],
  assetType: AssetType,
  isOpen: boolean
): ModalPropsMap['new-content'] => ({ isOpen, strategy: strategies.get(assetType)!, type: 'new-content' });

export const updateModalData = <Key extends keyof ModalPropsMap>(
  prevData: ModalPropsMap,
  value: ModalPropsMap[Key]
): ModalPropsMap => ({ ...prevData, [value.type]: value });

const isExpandableItem = (id: number, contentById: ReadonlyMap<number, ProjectContent>, content: readonly ProjectContent[]) =>
  contentById.has(id) && PROJECT_ITEM_CONFIG[contentById.get(id)!.type].expandable && content.some(({ parentId }) => parentId === id);

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
  const contentById = new Map(content.map((item) => [item.id, item]));
  const bundleIds = content.reduce<number[]>((ids, { id, type }) => {
    if (type === AssetType.Bundle) ids.push(id);
    return ids;
  }, []);
  const createdItems = isCurrentProject
    ? content.filter((item) => !previousProject.content?.some(({ id }) => id === item.id))
    : [];
  const createdItem = createdItems[0];
  const createdParentIds = createdItems.map(({ parentId }) => parentId);
  const expandedItemCandidates = state.expandedItemIds.concat(createdParentIds);
  const expandedItemIds = expandedItemCandidates.filter((id) => isExpandableItem(id, contentById, content));
  const projectTree = getProjectTreeRootNodes(content);
  const visibleProjectItems = getVisibleProjectTreeItems(projectTree.rootNodes, new Set(expandedItemIds));
  state.projectProxy.setProject(project);

  return {
    ...state,
    bundleIds,
    contentById,
    expandedItemIds,
    projectTree,
    visibleProjectItems,
    ...getProjectSelectionState(state, isCurrentProject, createdItem)
  };
};

export const getDeletableContent = (state: AppContainerState, assetType: AssetType, id: number) => {
  const selectedIds = state.selection.includes(id) ? state.selection : [id];
  const { contentById } = state;
  const selectedIdSet = new Set(selectedIds);
  const selectedItem = contentById.get(id);
  if (!selectedItem || selectedItem.type !== assetType) return [];

  return selectedIds.reduce<typeof selectedItem[]>((items, selectedId) => {
    const item = contentById.get(selectedId);
    if (!item || item.type === AssetType.Project || (item.type === AssetType.ProjectFolder && item.parentId === 0)) {
      return items;
    }

    let parentId = item.parentId;
    while (parentId) {
      if (selectedIdSet.has(parentId)) return items;
      parentId = contentById.get(parentId)?.parentId ?? 0;
    }

    items.push(item);
    return items;
  }, []);
};
