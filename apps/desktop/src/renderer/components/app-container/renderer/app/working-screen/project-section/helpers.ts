import type { FolderConfig, ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../../../../../types';

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
  descendantCount: number;
  depth: number;
  node: ProjectTreeNode;
};

export const getFlatProjectTreeItems = (nodes: readonly ProjectTreeNode[], depth = 0): VisibleProjectTreeItem[] => {
  const items: VisibleProjectTreeItem[] = [];

  for (const node of nodes) {
    const itemIndex = items.length;
    items.push({ descendantCount: 0, depth, node });
    items.push(...getFlatProjectTreeItems(node.children, depth + 1));
    items[itemIndex].descendantCount = items.length - itemIndex - 1;
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

/** Converts pre-content project data to the manifest-shaped tree input. */
export const withLegacyFolders = (content: ProjectContent[], folders: FolderConfig[]): ProjectContent[] => {
  if (content.some((item) => item.type === AssetType.ProjectFolder)) return content;

  const folderByPath = new Map<string, ProjectContent>();
  let virtualFolderId = -1;

  for (const folder of [...folders].sort((left, right) => left.name.split('/').length - right.name.split('/').length)) {
    let parentId = 0;
    let path = '';
    const segments = folder.name.split('/').filter(Boolean);

    if (!segments.length) {
      folderByPath.set('', { data: null, id: folder.id, name: '', parentId: 0, type: AssetType.ProjectFolder, version: 0 });
      continue;
    }

    for (const [index, name] of segments.entries()) {
      path = path ? `${path}/${name}` : name;
      let item = folderByPath.get(path);
      if (!item) {
        item = {
          data: null,
          id: index === segments.length - 1 ? folder.id : virtualFolderId--,
          name,
          parentId,
          type: AssetType.ProjectFolder,
          version: 0
        };
        folderByPath.set(path, item);
      }
      parentId = item.id;
    }
  }

  return Array.from(folderByPath.values()).concat(content);
};
