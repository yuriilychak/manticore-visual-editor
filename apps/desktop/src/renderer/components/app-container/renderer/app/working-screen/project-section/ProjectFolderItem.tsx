import { type DragEvent, type FC, useState } from 'react';

import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';

import type { ProjectContent } from '../../../../../../../project/types';
import { AssetType, type ProjectActionHandler } from '../../../../../../../types';

import { RenameableItem } from '../renameable-item';
import type { ActionButtonConfig } from '../renameable-item/types';

import { type FolderTreeNode, PROJECT_BUNDLE_DRAG_TYPE, PROJECT_FOLDER_DRAG_TYPE } from './helpers';
import ProjectBundleItem from './ProjectBundleItem';

type ProjectFolderItemProps = {
  content: ProjectContent[];
  node: FolderTreeNode;
  onAction: ProjectActionHandler;
  parentPath?: string;
};

const FOLDER_ACTIONS: ActionButtonConfig[] = [
  { action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon },
  { action: 'add-bundle', tooltipLocale: 'bundle.add', icon: <Box alt="" component="img" src="./icons/bundle-add.svg" sx={{ height: 20, width: 20 }} /> }
];
const ProjectFolderItem: FC<ProjectFolderItemProps> = ({ content, node, onAction, parentPath = '' }) => {
  const [isExpanded, setExpanded] = useState(false);
  const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const handleFolderAction: ProjectActionHandler = (action, contentType, id, data) =>
    onAction(action, contentType, id, action === 'add-folder' || action === 'add-bundle' ? folderPath : data);
  const bundles = content
    .filter((item) => item.type === AssetType.Bundle && item.parentId === node.folder?.id)
    .map((bundle) => (
      <Box key={bundle.id} pl={1}>
        <ProjectBundleItem bundle={bundle} onAction={onAction} />
      </Box>
    ));
  const hasChildren = node.children.length > 0 || bundles.length > 0;
  const Icon = hasChildren && isExpanded ? FolderOpenIcon : FolderIcon;
  const folderItem = node.folder ? (
    <RenameableItem
      actions={FOLDER_ACTIONS}
      contentType={AssetType.ProjectFolder}
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
    <ProjectFolderItem content={content} key={child.name} node={child} onAction={onAction} parentPath={folderPath} />
  ));
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button, input')) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(PROJECT_FOLDER_DRAG_TYPE, String(node.folder?.id));
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).some((type) => type === PROJECT_FOLDER_DRAG_TYPE || type === PROJECT_BUNDLE_DRAG_TYPE)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const isFolder = Array.from(event.dataTransfer.types).includes(PROJECT_FOLDER_DRAG_TYPE);
    const isBundle = Array.from(event.dataTransfer.types).includes(PROJECT_BUNDLE_DRAG_TYPE);
    if (!isFolder && !isBundle) return;

    event.preventDefault();

    const draggedId = Number(event.dataTransfer.getData(isFolder ? PROJECT_FOLDER_DRAG_TYPE : PROJECT_BUNDLE_DRAG_TYPE));
    if (!Number.isInteger(draggedId) || draggedId < 0 || (isFolder && draggedId === node.folder?.id)) return;

    void Promise.resolve(onAction('move', isFolder ? AssetType.ProjectFolder : AssetType.Bundle, draggedId, folderPath)).catch(() => undefined);
  };
  const draggableFolderItem = node.folder ? (
    <Box draggable onDragOver={handleDragOver} onDragStart={handleDragStart} onDrop={handleDrop} width="100%">
      {folderItem}
    </Box>
  ) : (
    folderItem
  );

  if (!hasChildren) return <Box pl={1}>{draggableFolderItem}{bundles}</Box>;

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
          {draggableFolderItem}
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>{children}{bundles}</AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ProjectFolderItem;
