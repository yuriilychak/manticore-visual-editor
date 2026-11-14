import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, LinearProgress, Typography } from '@mui/material';

type MultipleImageProgressDialogProps = {
  open: boolean;
  processedImageCount: number;
  totalImageCount: number;
};

const MultipleImageProgressDialog: FC<MultipleImageProgressDialogProps> = ({ open, processedImageCount, totalImageCount }) => {
  const { t } = useTranslation();
  const progress = totalImageCount ? processedImageCount / totalImageCount * 100 : 0;

  return (
    <Dialog aria-labelledby="multiple-image-progress-title" disableEscapeKeyDown onClose={() => undefined} open={open}>
      <DialogContent sx={{ minWidth: 280 }}>
        <Typography id="multiple-image-progress-title" mb={2} variant="body1">
          {t('details.processingImages', { processed: processedImageCount, total: totalImageCount })}
        </Typography>
        <LinearProgress aria-label={t('details.processingImages', { processed: processedImageCount, total: totalImageCount })} value={progress} variant="determinate" />
      </DialogContent>
    </Dialog>
  );
};

export default MultipleImageProgressDialog;
