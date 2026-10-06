import { useVirtualizer } from '@tanstack/react-virtual';
import { type FC, useCallback, useMemo, useRef, useState } from 'react';

import { Box } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { getProjectTree, getVisibleProjectTreeItems } from './helpers';
import ProjectItem from './ProjectItem';
import ProjectVirtualRow from './ProjectVirtualRow';

const PROJECT_ROW_HEIGHT = 28;
const estimateRowSize = () => PROJECT_ROW_HEIGHT;

const ProjectSection: FC = () => {
  const { onAction, project, selectedItems } = useProjectStructure();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollElementRef.current, []);
  const [expandedItemIds, setExpandedItemIds] = useState<readonly number[]>([]);
  const projectTree = useMemo(
    () => getProjectTree(project?.content ?? []),
    [project?.content]
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
  const expandedItemIdSet = useMemo(() => new Set(expandedItemIds), [expandedItemIds]);
  const visibleItems = useMemo(
    () => getVisibleProjectTreeItems(rootNodes, expandedItemIdSet),
    [expandedItemIdSet, rootNodes]
  );
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    estimateSize: estimateRowSize,
    getScrollElement,
    overscan: 8
  });
  const toggleExpanded = useCallback((id: number) => setExpandedItemIds((current) =>
    current.includes(id) ? current.filter((expandedId) => expandedId !== id) : current.concat(id)
  ), []);
  if (!project) return null;

  const { name } = project;

  return (
    <Box component="header" display="flex" flexDirection="column" height="100%" minHeight={0} p={1}>
      <ProjectItem
        contentType={AssetType.Project}
        dropTargetId={rootFolder?.item.id}
        id={0}
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
                hasChildren={children.length > 0}
                isExpanded={expandedItemIdSet.has(item.id)}
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
