import { type DragEvent, type FC, type MouseEvent, type ReactNode } from 'react';

import { Box } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';

import { RenameableItem } from '../renameable-item';

import { DISABLED_ACTIONS, PROJECT_ITEM_CONFIG, PROJECT_ITEM_STYLES } from './constants';

export type ProjectItemProps = {
  children?: ReactNode;
  contentType: AssetType;
  hasChildren?: boolean;
  expanded?: boolean;
  id: number;
  name: string;
  onAction: ProjectActionHandler;
  dropTargetId?: number;
  isSelected?: boolean;
};

const ProjectItem: FC<ProjectItemProps> = ({
  contentType,
  dropTargetId,
  hasChildren = false,
  expanded = false,
  id,
  isSelected = false,
  name,
  onAction
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

  return (
    <Box
      aria-selected={isSelected}
      data-project-item
      draggable={Boolean(config.dragType)}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      sx={PROJECT_ITEM_STYLES.root}
      width="100%"
    >
      <RenameableItem
        actions={config.actions}
        contentType={contentType}
        disabledActions={DISABLED_ACTIONS}
        expandable={Boolean(config.expandable)}
        expandIconDisabled={!hasChildren}
        expanded={expanded}
        Icon={Icon}
        id={id}
        name={name}
        onAction={onAction}
      />
    </Box>
  );
};

export default ProjectItem;
