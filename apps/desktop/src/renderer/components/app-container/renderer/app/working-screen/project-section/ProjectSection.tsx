import { type FC } from 'react';

import WorkIcon from '@mui/icons-material/Work';
import { Box } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../../types';

import { RenameableItem } from '../renameable-item';

type ProjectSectionProps = {
  name: string;
  onAction: ProjectActionHandler;
};

const ProjectSection: FC<ProjectSectionProps> = ({ name, onAction }) => (
  <Box component="header" p={1}>
    <RenameableItem
      contentType="project"
      id={0}
      Icon={WorkIcon}
      name={name}
      onAction={onAction}
    />
  </Box>
);

export default ProjectSection;
