import { TableCell } from '@mui/material';

import { getAssetName } from '../helpers';

type ImportAssetNameCellProps = {
  filePath: string;
};

export const ImportAssetNameCell = ({ filePath }: ImportAssetNameCellProps) => <TableCell>{getAssetName(filePath)}</TableCell>;
