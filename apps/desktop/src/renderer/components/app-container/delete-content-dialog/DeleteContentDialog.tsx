import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import type { ModalComponent, ModalPropsMap } from '../modal-types';

export type DeleteContentDialogData = ModalPropsMap['delete-content'];

const DeleteContentDialog: ModalComponent<'delete-content'> = ({ assetType, id, isOpen, name, onAction }) => {
  const { t } = useTranslation();
  const [isDeleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) setDeleting(false);
  }, [isOpen]);
  const handleConfirm = async () => {
    setDeleting(true);
    await onAction('delete', assetType, id);
  };
  const handleClose = () => {
    void onAction('close-delete-modal', assetType, id);
  };

  return (
    <Dialog disableEscapeKeyDown={isDeleting} onClose={isDeleting ? undefined : handleClose} open={isOpen}>
      <DialogTitle>{t('common.deleteContentTitle')}</DialogTitle>
      <DialogContent><DialogContentText>{t('common.deleteContentMessage', { name })}</DialogContentText></DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          color="error"
          disabled={isDeleting}
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
