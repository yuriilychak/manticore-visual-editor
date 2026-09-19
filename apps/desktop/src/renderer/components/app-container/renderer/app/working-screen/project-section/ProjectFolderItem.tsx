import { type FC, useState } from 'react';

import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../../types';

import { RenameableItem } from '../renameable-item';
import type { ActionButtonConfig } from '../renameable-item/types';

import type { FolderTreeNode } from './helpers';

type ProjectFolderItemProps = {
  node: FolderTreeNode;
  onAction: ProjectActionHandler;
  parentPath?: string;
};

const FOLDER_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon }
];

const ProjectFolderItem: FC<ProjectFolderItemProps> = ({ node, onAction, parentPath = '' }) => {
  const [isExpanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const Icon = isExpanded ? FolderOpenIcon : FolderIcon;
  const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const handleFolderAction: ProjectActionHandler = (action, contentType, id, data) =>
    onAction(action, contentType, id, action === 'add-folder' ? folderPath : data);
  const folderItem = node.folder ? (
    <RenameableItem
      actions={FOLDER_ACTIONS}
      contentType="project-folder"
      id={node.folder.id}
      Icon={Icon}
      name={node.name}
      onAction={handleFolderAction}
    />
  ) : (
    <Box alignItems="center" display="flex" gap={0.5}>
      <Icon color="action" fontSize="small" />
      <Typography component="h2" variant="subtitle1">
        {node.name}
      </Typography>
    </Box>
  );
  const children = node.children.map((child) => (
    <ProjectFolderItem key={child.name} node={child} onAction={onAction} parentPath={folderPath} />
  ));

  if (!hasChildren) return <Box pl={1}>{folderItem}</Box>;

  return (
    <Box pl={1}>
      <Accordion
        disableGutters
        elevation={0}
        expanded={isExpanded}
        onChange={(event) => {
          if (event.target instanceof Element && event.target.closest('button, input')) return;

          setExpanded(!isExpanded);
        }}
        slots={{ heading: 'div' }}
        square
        sx={{ bgcolor: 'transparent', border: 0, '&::before': { display: 'none' } }}
      >
        <AccordionSummary
          aria-label={`${node.name} folder`}
          component="div"
          sx={{ minHeight: 0, px: 0, '&.Mui-expanded': { minHeight: 0 }, '& .MuiAccordionSummary-content': { my: 0 } }}
        >
          <Box width="100%">{folderItem}</Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>{children}</AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ProjectFolderItem;
