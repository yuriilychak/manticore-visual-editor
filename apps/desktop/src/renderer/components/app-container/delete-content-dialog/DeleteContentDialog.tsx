import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

type DeleteContentDialogProps = {
  isDeleting: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
};

const DeleteContentDialog: FC<DeleteContentDialogProps> = ({ isDeleting, name, onClose, onConfirm, open }) => {
  const { t } = useTranslation();

  return (
    <Dialog disableEscapeKeyDown={isDeleting} onClose={isDeleting ? undefined : onClose} open={open}>
      <DialogTitle>{t('common.deleteContentTitle')}</DialogTitle>
      <DialogContent><DialogContentText>{t('common.deleteContentMessage', { name })}</DialogContentText></DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="error" disabled={isDeleting} onClick={onConfirm} variant="contained">{t('common.delete')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteContentDialog;
