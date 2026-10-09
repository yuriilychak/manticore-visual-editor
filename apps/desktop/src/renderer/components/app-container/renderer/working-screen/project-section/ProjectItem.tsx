import { type Dispatch, type DragEvent, type FC, type MouseEvent, type SetStateAction } from 'react';

import { Box } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../../../types';

import { RenameableItem } from '../renameable-item';

import { PROJECT_ITEM_CONFIG, PROJECT_ITEM_STYLES } from './constants';

export type ProjectContextMenu = {
  contentType: AssetType;
  id: number;
  isOpen: boolean;
  left: number;
  top: number;
};
export const DEFAULT_PROJECT_CONTEXT_MENU: ProjectContextMenu = {
  contentType: AssetType.Project,
  id: 0,
  isOpen: false,
  left: 0,
  top: 0
};

export type ProjectItemProps = {
  contentType: AssetType;
  hasChildren: boolean;
  expanded: boolean;
  id: number;
  isEditing: boolean;
  name: string;
  onAction: ProjectActionHandler;
  onEditingChange: (id: number) => void;
  isContextMenuOpen: boolean;
  setContextMenu: Dispatch<SetStateAction<ProjectContextMenu>>;
  dropTargetId?: number;
  isSelected: boolean;
};

const ProjectItem: FC<ProjectItemProps> = ({
  contentType,
  dropTargetId,
  hasChildren,
  expanded,
  id,
  isEditing,
  isSelected,
  name,
  onAction,
  onEditingChange,
  isContextMenuOpen,
  setContextMenu
}) => {
  const config = PROJECT_ITEM_CONFIG[contentType];
  const resolvedDropTargetId = dropTargetId ?? id;
  const { icon: Icon } = config;
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!config.dragType || (event.target instanceof Element && event.target.closest('button, input'))) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(config.dragType, String(id));
  };
  const getDropTarget = (event: DragEvent<HTMLDivElement>) =>
    Object.entries(config.dropTargets ?? {}).find(([dragType]) => Array.from(event.dataTransfer.types).includes(dragType));
  const getDraggedItem = (event: DragEvent<HTMLDivElement>) => {
    const dropTarget = getDropTarget(event);
    if (!dropTarget) return;

    const [dragType, draggedContentType] = dropTarget;
    const draggedId = Number(event.dataTransfer.getData(dragType));
    if (!Number.isInteger(draggedId) || draggedId < 0 || (draggedContentType === contentType && draggedId === id)) return;

    return { draggedContentType, draggedId };
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!getDropTarget(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const draggedItem = getDraggedItem(event);
    if (!draggedItem) return;

    event.preventDefault();
    void Promise.resolve(onAction('move', draggedItem.draggedContentType, draggedItem.draggedId, resolvedDropTargetId)).catch(() => undefined);
  };
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button, input')) return;

    void onAction('select', contentType, id, event.ctrlKey || event.metaKey);
  };
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu(isContextMenuOpen 
      ? DEFAULT_PROJECT_CONTEXT_MENU 
      : { contentType, id, isOpen: true, left: event.clientX, top: event.clientY }
    );
  };

  return (
    <Box
      aria-selected={isSelected}
      data-menu-open={isContextMenuOpen}
      data-project-item
      draggable={Boolean(config.dragType)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      sx={PROJECT_ITEM_STYLES.root}
      width="100%"
    >
      <RenameableItem
        contentType={contentType}
        expandable={Boolean(config.expandable)}
        expandIconDisabled={!hasChildren}
        expanded={expanded}
        Icon={Icon}
        id={id}
        isEditing={isEditing}
        name={name}
        onAction={onAction}
        onEditingChange={onEditingChange}
      />
    </Box>
  );
};

export default ProjectItem;
