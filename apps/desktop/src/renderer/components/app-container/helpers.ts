import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';
import type { ProjectInfo } from '../../types';
import type { ModalPropsMap } from './modal-types';
import { PROJECT_ITEM_CONFIG } from './constants';
import type { AppContainerState, ProjectTreeNode, ReducerActionHandler, VisibleProjectTreeItem } from './types';

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

export const getProjectTreeRootNodes = (content: ProjectContent[]) => {
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

export const reducerAction = <Payload>(
  handler: (prevState: AppContainerState, payload: Payload) => AppContainerState
): ReducerActionHandler => (prevState, payload) => handler(prevState, payload as Payload);

export const updateModalData = <Key extends keyof ModalPropsMap>(
  prevData: ModalPropsMap,
  value: ModalPropsMap[Key]
): ModalPropsMap => ({ ...prevData, [value.type]: value });

export const projectChanged = (state: AppContainerState, project: ProjectInfo): AppContainerState => {
  const previousProject = state.project;
  const content = project.content ?? [];
  const contentById = new Map(content.map((item) => [item.id, item]));
  const createdItem = previousProject?.path === project.path
    ? content.find((item) => !previousProject.content?.some(({ id }) => id === item.id))
    : undefined;
  const createdItems = previousProject?.path === project.path
    ? content.filter((item) => !previousProject.content?.some(({ id }) => id === item.id))
    : [];
  const validExpandedItemIds = state.expandedItemIds.filter((id) => {
    const item = contentById.get(id);

    return Boolean(item && PROJECT_ITEM_CONFIG[item.type].expandable && content.some((contentItem) => contentItem.parentId === id));
  });
  const expandedItemIds = createdItems.reduce<readonly number[]>((ids, { parentId }) => {
    const parent = contentById.get(parentId);

    return parent && PROJECT_ITEM_CONFIG[parent.type].expandable && !ids.includes(parentId)
      ? ids.concat(parentId)
      : ids;
  }, validExpandedItemIds);
  state.projectProxy.setProject(project);

  return {
    ...state,
    bundles: project.content?.filter((content) => content.type === AssetType.Bundle) ?? [],
    contentById,
    expandedItemIds,
    project,
    selection: createdItem ? [createdItem.id] : previousProject?.path === project.path ? state.selection : [],
    selectionAnchor: createdItem ? createdItem.id : previousProject?.path === project.path ? state.selectionAnchor : null
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
