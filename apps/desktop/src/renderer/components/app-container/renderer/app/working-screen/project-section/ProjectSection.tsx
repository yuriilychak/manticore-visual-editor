import { type DragEvent, type FC } from 'react';

import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import WorkIcon from '@mui/icons-material/Work';
import { Box } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { RenameableItem } from '../renameable-item';

import { getFolderTree, PROJECT_BUNDLE_DRAG_TYPE, PROJECT_FOLDER_DRAG_TYPE } from './helpers';
import ProjectBundleItem from './ProjectBundleItem';
import ProjectFolderItem from './ProjectFolderItem';

const PROJECT_ACTIONS = [
  { action: 'add-folder', tooltipLocale: 'folder.add', Icon: CreateNewFolderIcon },
  { action: 'add-bundle', tooltipLocale: 'bundle.add', icon: <Box alt="" component="img" src="./icons/bundle-add.svg" sx={{ height: 20, width: 20 }} /> }
];
const ProjectSection: FC = () => {
  const { content, folders, name, onAction } = useProjectStructure();
  const folderTree = getFolderTree(folders);
  const rootFolder = folders.find((folder) => !folder.name);
  const handleRootDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).some((type) => type === PROJECT_FOLDER_DRAG_TYPE || type === PROJECT_BUNDLE_DRAG_TYPE)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleRootDrop = (event: DragEvent<HTMLDivElement>) => {
    const isFolder = Array.from(event.dataTransfer.types).includes(PROJECT_FOLDER_DRAG_TYPE);
    const isBundle = Array.from(event.dataTransfer.types).includes(PROJECT_BUNDLE_DRAG_TYPE);
    if (!isFolder && !isBundle) return;

    event.preventDefault();
    const draggedId = Number(event.dataTransfer.getData(isFolder ? PROJECT_FOLDER_DRAG_TYPE : PROJECT_BUNDLE_DRAG_TYPE));
    if (!Number.isInteger(draggedId) || draggedId < 0) return;

    void Promise.resolve(onAction('move', isFolder ? AssetType.ProjectFolder : AssetType.Bundle, draggedId, '')).catch(() => undefined);
  };

  return (
    <Box component="header" p={1}>
      <Box onDragOver={handleRootDragOver} onDrop={handleRootDrop}>
        <RenameableItem
          actions={PROJECT_ACTIONS}
          contentType={AssetType.Project}
          id={0}
          Icon={WorkIcon}
          name={name}
          onAction={onAction}
        />
      </Box>
      {folderTree.map((node) => (
        <ProjectFolderItem content={content} key={node.name} node={node} onAction={onAction} />
      ))}
      {content.filter((item) => item.type === AssetType.Bundle && item.parentId === rootFolder?.id).map((bundle) => {

        return (
          <Box key={bundle.id} pl={1}><ProjectBundleItem bundle={bundle} onAction={onAction} /></Box>
        );
      })}
    </Box>
  );
};

export default ProjectSection;
