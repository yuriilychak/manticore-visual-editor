import { useTranslation } from 'react-i18next';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { IconButton, TableCell, Tooltip } from '@mui/material';

import { getFileName } from '../helpers';

type ImportAssetActionsCellProps = {
  disabled: boolean;
  filePath: string;
  onRemove: (filePath: string) => void;
};

export const ImportAssetActionsCell = ({ disabled, filePath, onRemove }: ImportAssetActionsCellProps) => {
  const { t } = useTranslation();

  return (
    <TableCell align="right">
      <Tooltip title={t('importAssets.remove')}>
        <IconButton aria-label={`${t('importAssets.remove')} ${getFileName(filePath)}`} disabled={disabled} onClick={() => onRemove(filePath)} size="small">
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </TableCell>
  );
};
