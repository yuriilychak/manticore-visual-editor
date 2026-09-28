import { type FC, useMemo } from 'react';

import { Box } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { getProjectTree, type ProjectTreeNode, withLegacyFolders } from './helpers';
import ProjectItem from './ProjectItem';
import ProjectTreeItem from './ProjectTreeItem';

const ProjectSection: FC = () => {
  const { onAction, project } = useProjectStructure();
  const projectTree = useMemo(
    () => getProjectTree(withLegacyFolders(project?.content ?? [], project?.folders ?? [])),
    [project?.content, project?.folders]
  );
  if (!project) return null;

  const { name } = project;
  const rootFolder = projectTree.find((node) => node.item.type === AssetType.ProjectFolder && node.item.parentId === 0 && !node.item.name);
  const rootNodes = rootFolder ? rootFolder.children.concat(projectTree.filter((node) => node !== rootFolder)) : projectTree;

  const renderNode = (node: ProjectTreeNode) => <ProjectTreeItem key={node.item.id} node={node} onAction={onAction} />;

  return (
    <Box component="header" height="100%" minHeight={0} p={1} sx={{ overflowX: 'hidden', overflowY: 'auto' }}>
      <ProjectItem contentType={AssetType.Project} dropTargetId={rootFolder?.item.id} id={0} name={name} onAction={onAction} />
      {rootNodes.map(renderNode)}
    </Box>
  );
};

export default ProjectSection;
