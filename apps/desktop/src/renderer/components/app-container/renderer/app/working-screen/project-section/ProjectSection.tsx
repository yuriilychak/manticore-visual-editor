import { type FC } from 'react';

import WorkIcon from '@mui/icons-material/Work';
import { Box } from '@mui/material';

import { RenameableItem } from '../renameable-item';

type ProjectSectionProps = {
  name: string;
  onRename?: (name: string) => Promise<void>;
};

const ProjectSection: FC<ProjectSectionProps> = ({ name, onRename }) => (
  <Box component="header" p={1}>
    <RenameableItem
      Icon={WorkIcon}
      name={name}
      onAction={() => undefined}
      onRename={onRename ?? (() => undefined)}
    />
  </Box>
);

export default ProjectSection;
