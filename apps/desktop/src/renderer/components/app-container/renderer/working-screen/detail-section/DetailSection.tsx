import type { ProjectContent } from '@manticore/project/types';
import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { AssetType } from '../../../../../../types';
import { PROJECT_ITEM_CONFIG } from '../../../constants';
import { useProjectStructure } from '../../../ProjectStructureContext';
import { FolderBundleDetails } from './FolderBundleDetails';
import { ImageDetails } from './ImageDetails';

const DETAILS_COMPONENT_BY_TYPE: Partial<Record<AssetType, FC<{ item: ProjectContent }>>> = {
  [AssetType.ProjectFolder]: FolderBundleDetails,
  [AssetType.Bundle]: FolderBundleDetails,
  [AssetType.BundleFolder]: FolderBundleDetails,
  [AssetType.Image]: ImageDetails
};

const DetailSection: FC = () => {
  const { t } = useTranslation();
  const { contentById, selection } = useProjectStructure();
  const selectedItem = selection.length === 1 ? contentById[selection[0]] : undefined;
  const HeaderIcon = selectedItem ? PROJECT_ITEM_CONFIG[selectedItem.type].icon : null;
  const DetailsComponent = selectedItem ? DETAILS_COMPONENT_BY_TYPE[selectedItem.type] : undefined;
  const title = selectedItem?.name ?? t('details.title');

  return (
    <Box boxSizing="border-box" height="100%" minHeight={0} overflow="auto" p={1}>
      <Box alignItems="center" display="flex" gap={1} minWidth={0}>
        {HeaderIcon && <HeaderIcon fontSize="small" />}
        <Typography component="h2" minWidth={0} noWrap title={title} variant="subtitle1">
          {title}
        </Typography>
      </Box>
      {DetailsComponent && selectedItem && <DetailsComponent item={selectedItem} />}
    </Box>
  );
};

export default memo(DetailSection);
