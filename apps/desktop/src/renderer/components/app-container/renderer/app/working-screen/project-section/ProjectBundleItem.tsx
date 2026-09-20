import { type DragEvent, type FC } from 'react';

import { Box } from '@mui/material';

import type { ProjectContent } from '../../../../../../../project/types';
import { AssetType, type ProjectActionHandler } from '../../../../../../../types';

import { RenameableItem } from '../renameable-item';

import { PROJECT_BUNDLE_DRAG_TYPE } from './helpers';

type ProjectBundleItemProps = {
  bundle: ProjectContent;
  onAction: ProjectActionHandler;
};

const ProjectBundleItem: FC<ProjectBundleItemProps> = ({ bundle, onAction }) => {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button, input')) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(PROJECT_BUNDLE_DRAG_TYPE, String(bundle.id));
  };

  return (
    <Box draggable onDragStart={handleDragStart}>
      <RenameableItem
        contentType={AssetType.Bundle}
        icon={<Box alt="" component="img" data-testid="bundle-icon" src="./icons/bundle.svg" sx={{ height: 20, width: 20 }} />}
        id={bundle.id}
        name={bundle.name}
        onAction={onAction}
      />
    </Box>
  );
};

export default ProjectBundleItem;
