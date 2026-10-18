import { useVirtualizer } from '@tanstack/react-virtual';
import { type FC, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Box } from '@mui/material';

import { AssetType } from '../../../../../../types';
import { ProjectItemId } from '../../../constants';
import { useProjectStructure } from '../../../ProjectStructureContext';

import { ITEM_HEIGHT } from '../renameable-item/constants';

import { ProjectActionsMenu } from './actions-menu';
import { DISABLED_ACTIONS } from './constants';
import ProjectItem, { DEFAULT_PROJECT_CONTEXT_MENU, type ProjectContextMenu } from './ProjectItem';
import ProjectVirtualRow from './ProjectVirtualRow';

const estimateRowSize = () => ITEM_HEIGHT;
const ProjectSection: FC = () => {
  const { expandedItemIds, onAction, projectProxy, selection, selectedIdSet, visibleProjectItems } = useProjectStructure();
  const project = projectProxy.project;
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const getScrollElement = useCallback(() => scrollElement, [scrollElement]);
  const [editingId, setEditingId] = useState(ProjectItemId.Empty);
  const [contextMenu, setContextMenu] = useState<ProjectContextMenu>(DEFAULT_PROJECT_CONTEXT_MENU);
  const derivedSelectedIdSet = useMemo(() => new Set(selection), [selection]);
  const selectedIds = selectedIdSet ?? derivedSelectedIdSet;
  const virtualizer = useVirtualizer({
    count: visibleProjectItems.length,
    estimateSize: estimateRowSize,
    getScrollElement,
    overscan: 8
  });
  const handleListClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('[data-project-item]')) return;

    void onAction('selection-cleared', AssetType.Project, ProjectItemId.Project);
  };
  const handleCloseContextMenu = useCallback(() => setContextMenu(DEFAULT_PROJECT_CONTEXT_MENU), []);
  const handleContextMenuAction = useCallback((action: string, contentType: AssetType, id: number) => {
    if (action === 'rename') {
      setEditingId(id);
      return;
    }

    void onAction(action, contentType, id);
  }, [onAction]);
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
  if (!project) return null;

  const { name } = project;

  return (
    <Box component="header" display="flex" flexDirection="column" height="100%" minHeight={0} p={1}>
      <ProjectItem
        contentType={AssetType.Project}
        dropTargetId={ProjectItemId.RootFolder}
        expanded={false}
        hasChildren={false}
        id={ProjectItemId.Project}
        isEditing={editingId === ProjectItemId.Project}
        isContextMenuOpen={contextMenu.isOpen && contextMenu.id === ProjectItemId.Project}
        isSelected={selectedIds.has(ProjectItemId.Project)}
        name={name}
        onAction={onAction}
        onEditingChange={setEditingId}
        setContextMenu={setContextMenu}
      />
      <Box
        flexGrow={1}
        minHeight={0}
        onClick={handleListClick}
        ref={setScrollElement}
        sx={{ overflowX: 'hidden', overflowY: 'auto' }}
      >
        <Box height={virtualizer.getTotalSize()} position="relative">
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const { depth, id } = visibleProjectItems[virtualItem.index];
            const item = projectProxy.getItemById(id);
            return item ? (
              <ProjectVirtualRow
                depth={depth}
                hasChildren={projectProxy.hasChildren(id)}
                isExpanded={expandedItemIds.has(item.id)}
                isEditing={editingId === item.id}
                isContextMenuOpen={contextMenu.isOpen && contextMenu.id === item.id}
                isSelected={selectedIds.has(item.id)}
                item={item}
                key={item.id}
                onAction={onAction}
                onEditingChange={setEditingId}
                setContextMenu={setContextMenu}
                start={virtualItem.start}
              />
            ) : null;
          })}
        </Box>
      </Box>
      <ProjectActionsMenu
        contentType={contextMenu.contentType}
        contextMenuPosition={contextMenu}
        disabledByAction={DISABLED_ACTIONS}
        id={contextMenu.id}
        onAction={handleContextMenuAction}
        onClose={handleCloseContextMenu}
        open={contextMenu.isOpen}
      />
    </Box>
  );
};

export default ProjectSection;
