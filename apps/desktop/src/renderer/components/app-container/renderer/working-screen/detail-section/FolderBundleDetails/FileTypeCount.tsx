import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { PROJECT_ITEM_CONFIG } from '../../../../constants';

import type { FileType } from './types';

const FILE_TYPE_LABEL_KEYS: Record<FileType, string> = {
  [AssetType.Image]: 'details.images',
  [AssetType.TextureAtlas]: 'details.textureAtlases',
  [AssetType.Font]: 'details.fonts'
};

type FileTypeCountProps = {
  count?: number;
  type: FileType;
};

const FileTypeCount: FC<FileTypeCountProps> = ({ count = 0, type }) => {
  const { t } = useTranslation();
  const Icon = PROJECT_ITEM_CONFIG[type].icon;

  return (
    <Box alignItems="center" display="flex" justifyContent="space-between">
      <Box alignItems="center" display="flex" gap={1} minWidth={0}>
        <Icon color="action" fontSize="small" />
        <Typography color="text.secondary" noWrap variant="body2">{t(FILE_TYPE_LABEL_KEYS[type])}</Typography>
      </Box>
      <Typography variant="body2">{count}</Typography>
    </Box>
  );
};

export default FileTypeCount;
