import type { ProjectContent } from '@manticore/project/types';
import { type FC, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { AssetType } from '../../../../../../types';
import { PROJECT_ITEM_CONFIG } from '../../../constants';
import { useProjectStructure } from '../../../ProjectStructureContext';

import { AtlasPreview } from './AtlasPreview';
import { FolderBundleDetails } from './FolderBundleDetails';
import { getSelectedAtlasIds, getSelectedImageIds } from './helpers';
import { ImageDetails } from './ImageDetails';
import MultipleImageDetails from './ImageDetails/MultipleImageDetails';

const DETAILS_COMPONENT_BY_TYPE: Partial<Record<AssetType, FC<{ item: ProjectContent }>>> = {
  [AssetType.ProjectFolder]: FolderBundleDetails,
  [AssetType.Bundle]: FolderBundleDetails,
  [AssetType.BundleFolder]: FolderBundleDetails,
  [AssetType.Image]: ImageDetails
};

const DetailSection: FC = () => {
  const { t } = useTranslation();
  const { childrenIdsByParentId, contentById, selection } = useProjectStructure();
  const selectedItem = selection.length === 1 ? contentById[selection[0]] : undefined;
  const selectedImageIds = useMemo(
    () => getSelectedImageIds(childrenIdsByParentId, contentById, selection),
    [childrenIdsByParentId, contentById, selection]
  );
  const selectedAtlasIds = useMemo(() => getSelectedAtlasIds(contentById, selection), [contentById, selection]);
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
        {selectedItem && <Typography color="text.secondary" variant="caption">#{selectedItem.id}</Typography>}
      </Box>
      {DetailsComponent && selectedItem && <DetailsComponent item={selectedItem} />}
      {Boolean(selectedAtlasIds.length) && <AtlasPreview atlasIds={selectedAtlasIds} />}
      {selectedImageIds.length > 1 && <MultipleImageDetails imageIds={selectedImageIds} key={selectedImageIds.join('-')} />}
    </Box>
  );
};

export default memo(DetailSection);
