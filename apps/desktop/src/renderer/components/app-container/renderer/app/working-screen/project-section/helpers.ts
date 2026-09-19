import type { FolderConfig } from '../../../../../../../types';

export type FolderTreeNode = {
  children: FolderTreeNode[];
  folder?: FolderConfig;
  name: string;
};

type MutableFolderTreeNode = Omit<FolderTreeNode, 'children'> & { children: Map<string, MutableFolderTreeNode> };

const toFolderTreeNode = (node: MutableFolderTreeNode): FolderTreeNode => ({
  children: Array.from(node.children.values(), toFolderTreeNode),
  folder: node.folder,
  name: node.name
});

export const getFolderTree = (folders: FolderConfig[]): FolderTreeNode[] => {
  const rootNodes = new Map<string, MutableFolderTreeNode>();

  for (const folder of folders) {
    if (!folder.name) continue;

    let nodes = rootNodes;
    const pathSegments = folder.name.split('/').filter(Boolean);

    for (const [index, name] of pathSegments.entries()) {
      let node = nodes.get(name);

      if (!node) {
        node = { children: new Map(), name };
        nodes.set(name, node);
      }
      if (index === pathSegments.length - 1) node.folder = folder;
      nodes = node.children;
    }
  }

  return Array.from(rootNodes.values(), toFolderTreeNode);
};
