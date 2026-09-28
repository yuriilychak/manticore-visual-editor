import { type FC, memo, useMemo } from 'react';

import { Box } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../../types';

import { type ProjectTreeNode } from './helpers';
import ProjectItem from './ProjectItem';
import TreeAccordion from './TreeAccordion';

type ProjectTreeItemProps = {
  node: ProjectTreeNode;
  onAction: ProjectActionHandler;
};

const ProjectTreeItem: FC<ProjectTreeItemProps> = ({ node, onAction }) => {
  const { children, item } = node;
  const { id, name, type } = item;
  const wrappedChildren = useMemo(
    () => children.map((child) => <ProjectTreeItem key={child.item.id} node={child} onAction={onAction} />),
    [children, onAction]
  );
  const ItemComponent = children.length ? TreeAccordion : ProjectItem;

  return (
    <Box pl={1}>
      <ItemComponent contentType={type} id={id} name={name} onAction={onAction}>
        {wrappedChildren}
      </ItemComponent>
    </Box>
  );
};

export default memo(ProjectTreeItem);
