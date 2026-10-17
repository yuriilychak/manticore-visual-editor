import { useTranslation } from 'react-i18next';

import ImageRounded from '@mui/icons-material/ImageRounded';
import { Box, CircularProgress, TableCell, Tooltip } from '@mui/material';

import { getFileName, isImage, toFileUrl } from '../helpers';

type ImportAssetPreviewCellProps = {
  filePath: string;
  isProcessing: boolean;
  previewUrl?: string;
};

export const ImportAssetPreviewCell = ({ filePath, isProcessing, previewUrl }: ImportAssetPreviewCellProps) => {
  const { t } = useTranslation();
  const image = isImage(filePath);

  return (
    <TableCell>
      <Tooltip
        disableHoverListener={!image}
        slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', maxWidth: 'none', p: 1 } } }}
        title={image ? <Box alt={getFileName(filePath)} component="img" src={previewUrl ?? toFileUrl(filePath)} sx={{ display: 'block', maxHeight: 256, maxWidth: 256 }} /> : ''}
      >
        {isProcessing
          ? <CircularProgress aria-label={`${t('importAssets.preview')} ${getFileName(filePath)}`} size={18} />
          : <ImageRounded color={image ? 'primary' : 'disabled'} fontSize="small" />}
      </Tooltip>
    </TableCell>
  );
};
