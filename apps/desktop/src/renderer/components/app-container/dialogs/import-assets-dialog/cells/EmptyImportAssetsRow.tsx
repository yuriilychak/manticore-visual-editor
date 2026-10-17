import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { TableCell, TableRow } from '@mui/material';

const EmptyImportAssetsRow = () => {
  const { t } = useTranslation();

  return <TableRow><TableCell colSpan={5}>{t('importAssets.noAssets')}</TableCell></TableRow>;
};

export default memo(EmptyImportAssetsRow);
