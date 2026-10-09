import { useVirtualizer } from '@tanstack/react-virtual';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Box } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { ProjectActionsMenu } from './actions-menu';
import { DISABLED_ACTIONS, PROJECT_ITEM_CONFIG } from './constants';
import { getProjectTree, getVisibleProjectTreeItems } from './helpers';
import ProjectItem, { type ProjectContextMenu } from './ProjectItem';
import ProjectVirtualRow from './ProjectVirtualRow';

const PROJECT_ROW_HEIGHT = 24;
const estimateRowSize = () => PROJECT_ROW_HEIGHT;
const CLOSED_CONTEXT_MENU: ProjectContextMenu = {
  contentType: AssetType.Project,
  id: 0,
  isOpen: false,
  left: 0,
  top: 0,
  menuActions: [],
  onAction: () => undefined
};

const ProjectSection: FC = () => {
  const { onAction, project, selectedItems } = useProjectStructure();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollElementRef.current, []);
  const [expandedItemIds, setExpandedItemIds] = useState<readonly number[]>([]);
  const [contextMenu, setContextMenu] = useState<ProjectContextMenu>(CLOSED_CONTEXT_MENU);
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
  const handleOpenContextMenu = useCallback((contextMenu: ProjectContextMenu) =>
    setContextMenu((current) => current.isOpen ? CLOSED_CONTEXT_MENU : contextMenu), []);
  const handleCloseContextMenu = useCallback(() => setContextMenu(CLOSED_CONTEXT_MENU), []);
  useEffect(() => {
    if (!contextMenu.isOpen) return;

    const handleContextMenu = (event: globalThis.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseContextMenu();
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => window.removeEventListener('contextmenu', handleContextMenu, true);
  }, [contextMenu.isOpen, handleCloseContextMenu]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isAddFolderShortcut = event.key.toLocaleLowerCase() === 'n' && !event.altKey && !event.shiftKey &&
        (window.manticore?.platform === 'darwin' ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);
      if (!isAddFolderShortcut || selectedItems.length > 1 || event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return;

      const selectedId = selectedItems[0] ?? 0;
      const selectedItem = selectedId === 0
        ? { id: 0, type: AssetType.Project }
        : project?.content?.find((item) => item.id === selectedId);
      if (!selectedItem || !PROJECT_ITEM_CONFIG[selectedItem.type].actions?.some((action) => action.action === 'add-folder')) return;

      event.preventDefault();
      void onAction('add-folder', selectedItem.type, selectedItem.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction, project?.content, selectedItems]);
  if (!project) return null;

  const { name } = project;

  return (
    <Box component="header" display="flex" flexDirection="column" height="100%" minHeight={0} p={1}>
      <ProjectItem
        contentType={AssetType.Project}
        dropTargetId={rootFolder?.item.id}
        expanded={false}
        hasChildren={false}
        id={0}
        isContextMenuOpen={contextMenu.isOpen && contextMenu.id === 0}
        isSelected={selectedItems.includes(0)}
        name={name}
        onAction={onAction}
        onOpenContextMenu={handleOpenContextMenu}
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
                isContextMenuOpen={contextMenu.isOpen && contextMenu.id === item.id}
                isSelected={selectedItems.includes(item.id)}
                item={item}
                key={item.id}
                onAction={onAction}
                onOpenContextMenu={handleOpenContextMenu}
                onToggleExpanded={toggleExpanded}
                start={virtualItem.start}
              />
            );
          })}
        </Box>
      </Box>
      <ProjectActionsMenu
        contentType={contextMenu.contentType}
        contextMenuPosition={contextMenu}
        disabledByAction={DISABLED_ACTIONS}
        menuActions={contextMenu.menuActions}
        onAction={contextMenu.onAction}
        onClose={handleCloseContextMenu}
        open={contextMenu.isOpen}
      />
    </Box>
  );
};

export default ProjectSection;
