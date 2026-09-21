import { type FC } from 'react';

import { Box } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

import { getFolderTree } from './helpers';
import ProjectBundleTree from './ProjectBundleTree';
import ProjectFolderTree from './ProjectFolderTree';
import ProjectItem from './ProjectItem';

const ProjectSection: FC = () => {
  const { content, folders, name, onAction } = useProjectStructure();
  const folderTree = getFolderTree(folders);
  const rootFolder = folders.find((folder) => !folder.name);

  return (
    <Box component="header" p={1}>
      <ProjectItem contentType={AssetType.Project} id={0} name={name} onAction={onAction} />
      {folderTree.map((node) => (
        <ProjectFolderTree content={content} key={node.name} node={node} onAction={onAction} />
      ))}
      {content.filter((item) => item.type === AssetType.Bundle && item.parentId === rootFolder?.id).map((bundle) => {

        return (
          <Box key={bundle.id} pl={1}><ProjectBundleTree content={content} item={bundle} onAction={onAction} /></Box>
        );
      })}
    </Box>
  );
};

export default ProjectSection;
