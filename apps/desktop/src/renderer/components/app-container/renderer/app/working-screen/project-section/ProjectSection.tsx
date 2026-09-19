import { type FC } from 'react';

import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import WorkIcon from '@mui/icons-material/Work';
import { Box } from '@mui/material';

import { useProjectStructure } from '../../../../ProjectStructureContext';

import { RenameableItem } from '../renameable-item';

import { getFolderTree } from './helpers';
import ProjectFolderItem from './ProjectFolderItem';

const PROJECT_ACTIONS = [{ action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon }];

const ProjectSection: FC = () => {
  const { folders, name, onAction } = useProjectStructure();
  const folderTree = getFolderTree(folders);

  return (
    <Box component="header" p={1}>
      <RenameableItem
        actions={PROJECT_ACTIONS}
        contentType="project"
        id={0}
        Icon={WorkIcon}
        name={name}
        onAction={onAction}
      />
      {folderTree.map((node) => (
        <ProjectFolderItem key={node.name} node={node} onAction={onAction} />
      ))}
    </Box>
  );
};

export default ProjectSection;
