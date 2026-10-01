import { memo, type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import type { AssetType, ProjectActionHandler } from '../../../../types';

type DeleteContentDialogProps = {
  contentType: AssetType | null;
  contentId: number | null;
  name: string;
  onClose: () => void;
  onAction: ProjectActionHandler;
  open: boolean;
};

const DeleteContentDialog: FC<DeleteContentDialogProps> = ({ contentId, contentType, name, onAction, onClose, open }) => {
  const { t } = useTranslation();
  const [isDeleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) setDeleting(false);
  }, [open]);
  const handleConfirm = async () => {
    if (contentId === null || contentType === null) return;

    setDeleting(true);
    await onAction('delete', contentType, contentId);
  };

  return (
    <Dialog disableEscapeKeyDown={isDeleting} onClose={isDeleting ? undefined : onClose} open={open}>
      <DialogTitle>{t('common.deleteContentTitle')}</DialogTitle>
      <DialogContent><DialogContentText>{t('common.deleteContentMessage', { name })}</DialogContentText></DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          color="error"
          disabled={isDeleting || contentId === null || contentType === null}
          onClick={() => void handleConfirm()}
          variant="contained"
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(DeleteContentDialog);
