import type { ProjectContent } from '@manticore/project/types';
import { type Dispatch, type FC, memo, type MouseEvent, type SetStateAction } from 'react';
import { Box } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../../types';
import type { ProjectContextMenu } from './ProjectItem';
import ProjectItem from './ProjectItem';

type ProjectVirtualRowProps = {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  isSelected: boolean;
  onAction: ProjectActionHandler;
  onEditingChange: (id: number) => void;
  isContextMenuOpen: boolean;
  setContextMenu: Dispatch<SetStateAction<ProjectContextMenu>>;
  onToggleExpanded: (id: number) => void;
  item: ProjectContent;
  start: number;
};

const ProjectVirtualRow: FC<ProjectVirtualRowProps> = ({
  depth,
  hasChildren,
  isExpanded,
  isEditing,
  isSelected,
  onAction,
  onEditingChange,
  isContextMenuOpen,
  setContextMenu,
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
        isEditing={isEditing}
        isSelected={isSelected}
        isContextMenuOpen={isContextMenuOpen}
        name={item.name}
        onAction={onAction}
        onEditingChange={onEditingChange}
        setContextMenu={setContextMenu}
      />
    </Box>
  );
};

export default memo(ProjectVirtualRow);
