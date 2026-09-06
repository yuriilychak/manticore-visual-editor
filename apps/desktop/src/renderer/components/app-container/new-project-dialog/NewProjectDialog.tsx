import type { FC } from 'react';

import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';

import type { NewProjectOptions, ProjectCreationValidation } from '../../../types';

import { useNewProjectDialog } from './useNewProjectDialog';

type NewProjectDialogProps = {
  onClose: () => void;
  onCreate: (options: NewProjectOptions) => Promise<void>;
  onSelectLocation: () => Promise<string>;
  onValidate: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
  open: boolean;
};

const NewProjectDialog: FC<NewProjectDialogProps> = ({ onClose, onCreate, onSelectLocation, onValidate, open }) => {
  const { error, handleCreate, handleNameChange, handleSelectLocation, isCreateDisabled, name, parentPath, t, validation } =
    useNewProjectDialog(onClose, onCreate, onSelectLocation, onValidate);

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      slotProps={{ paper: { elevation: 0, sx: { bgcolor: 'background.paper' } } }}
    >
      <DialogTitle>{t('project.title')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          label={t('project.name')}
          margin="dense"
          onChange={handleNameChange}
          size="small"
          value={name}
        />
        {validation.reason && <Alert severity="warning" sx={{ mt: 1 }}>{t(`project.${validation.reason}`)}</Alert>}
        <TextField
          fullWidth
          label={t('project.location')}
          margin="dense"
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={t('project.selectLocation')}>
                    <IconButton aria-label={t('project.selectLocation')} edge="end" onClick={handleSelectLocation} size="small">
                      <FolderOpenRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              readOnly: true
            }
          }}
          value={parentPath}
        />
      </DialogContent>
      <DialogActions sx={{ pb: 3, px: 3 }}>
        <Button onClick={onClose}>{t('project.cancel')}</Button>
        <Button disabled={isCreateDisabled} onClick={handleCreate} variant="contained">{t('project.create')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectDialog;
