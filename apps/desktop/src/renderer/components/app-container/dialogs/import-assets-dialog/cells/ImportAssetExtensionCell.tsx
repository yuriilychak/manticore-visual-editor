import { TableCell } from '@mui/material';

import { getFileExtension } from '../helpers';

type ImportAssetExtensionCellProps = {
  filePath: string;
};

export const ImportAssetExtensionCell = ({ filePath }: ImportAssetExtensionCellProps) => <TableCell>{getFileExtension(filePath).toLocaleUpperCase()}</TableCell>;
