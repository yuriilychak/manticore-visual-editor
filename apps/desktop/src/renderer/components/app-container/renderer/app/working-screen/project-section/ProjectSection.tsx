import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Box } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { getFlatProjectTreeItems, getProjectTree, type VisibleProjectTreeItem, withLegacyFolders } from './helpers';
import ProjectItem from './ProjectItem';
import ProjectVirtualRow from './ProjectVirtualRow';

const PROJECT_ROW_HEIGHT = 32;
const estimateRowSize = () => PROJECT_ROW_HEIGHT;

const ProjectSection: FC = () => {
  const { onAction, project, selectedItems } = useProjectStructure();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollElementRef.current, []);
  const [visibleItems, setVisibleItems] = useState<readonly VisibleProjectTreeItem[]>([]);
  const isMultiSelectionActive = selectedItems.length > 1;
  const projectTree = useMemo(
    () => getProjectTree(withLegacyFolders(project?.content ?? [], project?.folders ?? [])),
    [project?.content, project?.folders]
  );
  const { rootFolder, rootNodes } = useMemo(() => {
    const rootFolder = projectTree.find(
      (node) => node.item.type === AssetType.ProjectFolder && node.item.parentId === 0 && !node.item.name
    );

    return {
      rootFolder,
      rootNodes: rootFolder ? rootFolder.children.concat(projectTree.filter((node) => node !== rootFolder)) : projectTree
    };
  }, [projectTree]);
  const flatItems = useMemo(() => getFlatProjectTreeItems(rootNodes), [rootNodes]);
  const flatItemById = useMemo(() => new Map(flatItems.map((item) => [item.node.item.id, item])), [flatItems]);
  const rootItems = useMemo(() => flatItems.filter((item) => item.depth === 0), [flatItems]);
  useEffect(() => setVisibleItems(rootItems), [rootItems]);
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    estimateSize: estimateRowSize,
    getScrollElement,
    overscan: 16
  });

  const toggleExpanded = useCallback((id: number) => setVisibleItems((current) => {
    const visibleIndex = current.findIndex((item) => item.node.item.id === id);
    if (visibleIndex < 0) return current;

    const item = current[visibleIndex];
    const isExpanded = current[visibleIndex + 1]?.depth > item.depth;
    if (isExpanded) {
      const nextSiblingIndex = current.findIndex((nextItem, index) => index > visibleIndex && nextItem.depth <= item.depth);
      return current.slice(0, visibleIndex + 1).concat(current.slice(nextSiblingIndex < 0 ? current.length : nextSiblingIndex));
    }

    const directChildren = item.node.children
      .map((child) => flatItemById.get(child.item.id))
      .filter((child): child is VisibleProjectTreeItem => Boolean(child));

    return current.slice(0, visibleIndex + 1).concat(directChildren, current.slice(visibleIndex + 1));
  }), [flatItemById]);
  if (!project) return null;

  const { name } = project;

  return (
    <Box component="header" display="flex" flexDirection="column" height="100%" minHeight={0} p={1}>
      <ProjectItem
        contentType={AssetType.Project}
        dropTargetId={rootFolder?.item.id}
        id={0}
        isMultiSelectionActive={isMultiSelectionActive}
        isSelected={selectedItems.includes(0)}
        name={name}
        onAction={onAction}
      />
      <Box ref={scrollElementRef} flexGrow={1} minHeight={0} sx={{ overflowX: 'hidden', overflowY: 'auto' }}>
        <Box height={virtualizer.getTotalSize()} position="relative">
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const { depth, node } = visibleItems[virtualItem.index];
            const { children, item } = node;

            return (
              <ProjectVirtualRow
                depth={depth}
                isExpandable={children.length > 0}
                isMultiSelectionActive={isMultiSelectionActive}
                isExpanded={visibleItems[virtualItem.index + 1]?.depth > depth}
                isSelected={selectedItems.includes(item.id)}
                item={item}
                key={item.id}
                onAction={onAction}
                onToggleExpanded={toggleExpanded}
                start={virtualItem.start}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectSection;
