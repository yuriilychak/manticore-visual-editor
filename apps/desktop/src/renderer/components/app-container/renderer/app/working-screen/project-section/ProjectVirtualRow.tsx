import type { ProjectContent } from '@manticore/project/types';
import { type FC, memo, type MouseEvent } from 'react';

import { Box } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../../types';

import type { ProjectContextMenu } from './ProjectItem';
import ProjectItem from './ProjectItem';

type ProjectVirtualRowProps = {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onAction: ProjectActionHandler;
  isContextMenuOpen: boolean;
  onOpenContextMenu: (contextMenu: ProjectContextMenu) => void;
  onToggleExpanded: (id: number) => void;
  item: ProjectContent;
  start: number;
};

const ProjectVirtualRow: FC<ProjectVirtualRowProps> = ({
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  onAction,
  isContextMenuOpen,
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
        hasChildren={hasChildren}
        expanded={isExpanded}
        id={item.id}
        isSelected={isSelected}
        isContextMenuOpen={isContextMenuOpen}
        name={item.name}
        onAction={onAction}
        onOpenContextMenu={onOpenContextMenu}
      />
    </Box>
  );
};

export default memo(ProjectVirtualRow);
