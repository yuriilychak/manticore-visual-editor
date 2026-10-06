import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import type { ModalComponent, ModalPropsMap } from '../modal-types';

export type DeleteContentDialogData = ModalPropsMap['delete-content'];

const DeleteContentDialogContent: ModalComponent<'delete-content'> = ({ items, onAction }) => {
  const { t } = useTranslation();
  const [isDeleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    const [item] = items;
    if (!item) return;

    setDeleting(true);
    await onAction('delete', item.type, item.id, items.map(({ id }) => id));
  };
  const handleClose = () => {
    void onAction('close-delete-modal', items[0]?.type ?? 0, items[0]?.id ?? 0);
  };
  const name = items.map((item) => item.name).join(', ');

  return (
    <Dialog disableEscapeKeyDown={isDeleting} onClose={isDeleting ? undefined : handleClose} open>
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

const DeleteContentDialog: ModalComponent<'delete-content'> = ({ isOpen, items, onAction }) =>
  isOpen ? <DeleteContentDialogContent isOpen items={items} onAction={onAction} type="delete-content" /> : null;

export default memo(DeleteContentDialog);
