import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

type AtlasPreviewProps = {
  atlasIds: readonly number[];
};

const AtlasPreview: FC<AtlasPreviewProps> = ({ atlasIds }) => {
  const { t } = useTranslation();

  return (
    <Box aria-label={t('details.atlasPreview')} bgcolor="action.hover" display="flex" flexDirection="column" gap={1} minHeight={132} p={2} role="region">
      <Typography component="h3" variant="body2">{t('details.atlasPreview')}</Typography>
      <Typography color="text.secondary" variant="body2">
        {t('details.atlasPreviewUnavailable', { count: atlasIds.length })}
      </Typography>
    </Box>
  );
};

export default AtlasPreview;
