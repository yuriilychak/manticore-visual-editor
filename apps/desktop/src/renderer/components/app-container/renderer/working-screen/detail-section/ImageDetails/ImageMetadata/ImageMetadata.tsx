import type { ProjectImageMetadata } from '@manticore/project';
import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { IMAGE_METADATA_FIELDS } from './constants';
import { formatBytes, formatSize } from './helpers';
import type { ImageMetadataField } from './types';

type ImageMetadataProps = {
  metadata: ProjectImageMetadata;
};

const ImageMetadata: FC<ImageMetadataProps> = ({ metadata }) => {
  const { t } = useTranslation();
  const values: Record<ImageMetadataField, string> = {
    binarySize: formatBytes(metadata.binarySize, t('details.bytes')),
    imageFormat: metadata.format.toUpperCase(),
    realSize: formatSize(metadata.sourceWidth, metadata.sourceHeight),
    croppedSize: formatSize(metadata.croppedWidth, metadata.croppedHeight)
  };
  
  return (
    <Box columnGap={4} component="dl" display="flex" flexWrap="wrap" mt={2} rowGap={0.5}>
      {IMAGE_METADATA_FIELDS.map(({ minWidth, name }) => (
        <Box component="div" display="flex" flex={`1 1 ${minWidth}px`} justifyContent="space-between" key={name} minWidth={minWidth}>
          <Typography color="text.secondary" component="dt" variant="body2">{t(`details.${name}`)}</Typography>
          <Typography component="dd" m={0} textAlign="right" variant="body2">{values[name]}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default memo(ImageMetadata);
