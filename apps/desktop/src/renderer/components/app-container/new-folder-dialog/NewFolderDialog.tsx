import type { FC } from 'react';

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

import { useNewFolderDialog } from './useNewFolderDialog';

type NewFolderDialogProps = {
  existingFolderNames: readonly string[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  open: boolean;
};

const NewFolderDialog: FC<NewFolderDialogProps> = ({ existingFolderNames, onClose, onCreate, open }) => {
  const { error, handleCreate, handleNameChange, hasDuplicateName, isCreateDisabled, name, t } = useNewFolderDialog(
    onClose,
    onCreate,
    existingFolderNames
  );

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      slotProps={{ paper: { elevation: 0, sx: { bgcolor: 'background.paper' } } }}
    >
      <DialogTitle>{t('folder.title')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label={t('folder.name')}
          margin="dense"
          onChange={handleNameChange}
          size="small"
          error={hasDuplicateName}
          helperText={hasDuplicateName ? t('folder.alreadyExists') : undefined}
          value={name}
        />
      </DialogContent>
      <DialogActions sx={{ pb: 3, px: 3 }}>
        <Button onClick={onClose}>{t('folder.cancel')}</Button>
        <Button disabled={isCreateDisabled} onClick={handleCreate} variant="contained">
          {t('folder.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewFolderDialog;
