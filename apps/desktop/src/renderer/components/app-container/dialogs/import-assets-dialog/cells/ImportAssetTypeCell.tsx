import { useTranslation } from 'react-i18next';

import { TableCell } from '@mui/material';

import { isImage } from '../helpers';

type ImportAssetTypeCellProps = {
  filePath: string;
};

export const ImportAssetTypeCell = ({ filePath }: ImportAssetTypeCellProps) => {
  const { t } = useTranslation();

  return <TableCell>{t(isImage(filePath) ? 'importAssets.image' : 'importAssets.font')}</TableCell>;
};
