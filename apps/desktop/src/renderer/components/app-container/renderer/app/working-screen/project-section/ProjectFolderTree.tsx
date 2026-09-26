import { type FC, type SyntheticEvent, useState } from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';

import type { ProjectContent } from '@manticore/project/types';
import { AssetType, type ProjectActionHandler } from '../../../../../../../types';

import { type FolderTreeNode } from './helpers';
import ProjectBundleTree from './ProjectBundleTree';
import ProjectItem, { getProjectItemIcon } from './ProjectItem';

type ProjectFolderTreeProps = {
  content: ProjectContent[];
  node: FolderTreeNode;
  onAction: ProjectActionHandler;
  parentPath?: string;
};

const ProjectFolderTree: FC<ProjectFolderTreeProps> = ({ content, node, onAction, parentPath = '' }) => {
  const [isExpanded, setExpanded] = useState(false);
  const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const bundles = content
    .filter((item) => item.type === AssetType.Bundle && item.parentId === node.folder?.id)
    .map((bundle) => (
      <Box key={bundle.id} pl={1}>
        <ProjectBundleTree content={content} item={bundle} onAction={onAction} />
      </Box>
    ));
  const hasChildren = node.children.length > 0 || bundles.length > 0;
  const TreeIcon = getProjectItemIcon(AssetType.ProjectFolder, hasChildren && isExpanded);
  const folderItem = node.folder ? (
    <ProjectItem
      contentType={AssetType.ProjectFolder}
      expanded={hasChildren && isExpanded}
      id={node.folder.id}
      name={node.name}
      onAction={onAction}
      parentPath={folderPath}
    />
  ) : (
    <Box alignItems="center" display="flex" gap={0.5}>
      <TreeIcon color="action" fontSize="small" />
      <Typography component="h2" variant="subtitle1">
        {node.name}
      </Typography>
    </Box>
  );
  const children = node.children.map((child) => (
    <ProjectFolderTree content={content} key={child.name} node={child} onAction={onAction} parentPath={folderPath} />
  ));
  const handleAccordionChange = (event: SyntheticEvent) => {
    if (event.target instanceof Element && event.target.closest('button, input')) return;

    setExpanded(!isExpanded);
  };

  return (
    <Box pl={1}>
      {hasChildren ? (
        <Accordion
          disableGutters
          elevation={0}
          expanded={isExpanded}
          onChange={handleAccordionChange}
          slots={{ heading: 'div' }}
          square
          sx={{ bgcolor: 'transparent', border: 0, '&::before': { display: 'none' } }}
        >
          <AccordionSummary
            aria-label={`${node.name} folder`}
            component="div"
            sx={{ minHeight: 0, px: 0, '&.Mui-expanded': { minHeight: 0 }, '& .MuiAccordionSummary-content': { my: 0 } }}
          >
            {folderItem}
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>{children}{bundles}</AccordionDetails>
        </Accordion>
      ) : (
        <>
          {folderItem}
          {bundles}
        </>
      )}
    </Box>
  );
};

export default ProjectFolderTree;
