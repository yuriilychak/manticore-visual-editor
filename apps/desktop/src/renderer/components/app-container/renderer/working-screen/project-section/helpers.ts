import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../../../../types';

export const PROJECT_FOLDER_DRAG_TYPE = 'application/x-manticore-project-folder';
export const PROJECT_BUNDLE_DRAG_TYPE = 'application/x-manticore-project-bundle';
export const BUNDLE_FOLDER_DRAG_TYPE = 'application/x-manticore-bundle-folder';
export const TEXTURE_ATLAS_DRAG_TYPE = 'application/x-manticore-texture-atlas';
export const IMAGE_DRAG_TYPE = 'application/x-manticore-image';

export type ProjectTreeNode = {
  children: ProjectTreeNode[];
  item: ProjectContent;
};

export type VisibleProjectTreeItem = {
  depth: number;
  node: ProjectTreeNode;
};

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

/**
 * Links project content by ID once, preserving the manifest order for each
 * sibling group. Tree components receive these nodes directly and never need
 * to scan the complete content list while expanding.
 */
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
