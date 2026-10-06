import { type FC, memo, type MouseEvent } from 'react';

import { Box } from '@mui/material';

import type { ProjectContent } from '@manticore/project/types';
import type { ProjectActionHandler } from '../../../../../../../types';

import ProjectItem from './ProjectItem';

type ProjectVirtualRowProps = {
  depth: number;
  contextMenuPosition: { left: number; top: number } | null;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onAction: ProjectActionHandler;
  onCloseContextMenu: () => void;
  onOpenContextMenu: (id: number, event: MouseEvent<HTMLDivElement>) => void;
  onToggleExpanded: (id: number) => void;
  item: ProjectContent;
  start: number;
};

const ProjectVirtualRow: FC<ProjectVirtualRowProps> = ({
  depth,
  contextMenuPosition,
  hasChildren,
  isExpanded,
  isSelected,
  onAction,
  onCloseContextMenu,
  onOpenContextMenu,
  onToggleExpanded,
  item,
  start
}) => {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!hasChildren || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.closest('button, input'))) return;

    onToggleExpanded(item.id);
  };

  return (
    <Box
      onClick={handleClick}
      pl={depth + 1}
      position="absolute"
      sx={{ transform: `translateY(${start}px)` }}
      width="100%"
    >
      <ProjectItem
        contentType={item.type}
        contextMenuPosition={contextMenuPosition}
        hasChildren={hasChildren}
        expanded={isExpanded}
        id={item.id}
        isSelected={isSelected}
        name={item.name}
        onAction={onAction}
        onCloseContextMenu={onCloseContextMenu}
        onOpenContextMenu={onOpenContextMenu}
      />
    </Box>
  );
};

export default memo(ProjectVirtualRow);
