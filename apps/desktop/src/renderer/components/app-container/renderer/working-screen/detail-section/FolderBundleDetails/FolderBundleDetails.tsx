import type { ProjectContent } from '@manticore/project/types';
import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { useProjectStructure } from '../../../../ProjectStructureContext';
import { EMPTY_LOCALE_KEY_BY_TYPE, FILE_TYPES } from './constants';
import FileTypeCount from './FileTypeCount';
import { getFileCounts } from './helpers';

type FolderBundleDetailsProps = {
  item: ProjectContent;
};

const FolderBundleDetails: FC<FolderBundleDetailsProps> = ({ item }) => {
  const { t } = useTranslation();
  const { childrenIdsByParentId, contentById } = useProjectStructure();
  const counts = useMemo(() => getFileCounts(childrenIdsByParentId, contentById, item.id), [childrenIdsByParentId, contentById, item.id]);

  return counts.hasAnyContent ? (
    <Box mt={2}>
      <Typography component="h3" gutterBottom variant="body2">
        {t('details.filesByType')}
      </Typography>
      {FILE_TYPES.map((type) => Boolean(counts[type]) && <FileTypeCount count={counts[type]} key={type} type={type} />)}
    </Box>
  ) : (
    <Typography color="text.secondary" mt={2} variant="body2">
      {t(EMPTY_LOCALE_KEY_BY_TYPE[item.type] ?? 'details.folderEmpty')}
    </Typography>
  );
};

export default FolderBundleDetails;
