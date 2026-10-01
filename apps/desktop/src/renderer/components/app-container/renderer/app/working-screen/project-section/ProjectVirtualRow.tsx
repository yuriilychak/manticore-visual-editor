import { type FC, memo, type MouseEvent } from 'react';

import { Box } from '@mui/material';

import type { ProjectContent } from '@manticore/project/types';
import type { ProjectActionHandler } from '../../../../../../../types';

import ProjectItem from './ProjectItem';

type ProjectVirtualRowProps = {
  depth: number;
  isExpandable: boolean;
  isExpanded: boolean;
  isMultiSelectionActive: boolean;
  isSelected: boolean;
  onAction: ProjectActionHandler;
  onToggleExpanded: (id: number) => void;
  item: ProjectContent;
  start: number;
};

const ProjectVirtualRow: FC<ProjectVirtualRowProps> = ({
  depth,
  isExpandable,
  isExpanded,
  isMultiSelectionActive,
  isSelected,
  onAction,
  onToggleExpanded,
  item,
  start
}) => {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isExpandable || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.closest('button, input'))) return;

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
        expanded={isExpanded}
        id={item.id}
        isMultiSelectionActive={isMultiSelectionActive}
        isSelected={isSelected}
        name={item.name}
        onAction={onAction}
      />
    </Box>
  );
};

export default memo(ProjectVirtualRow);
