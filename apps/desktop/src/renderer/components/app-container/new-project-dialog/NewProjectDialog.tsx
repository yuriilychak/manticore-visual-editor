import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';

import type { NewProjectOptions, ProjectCreationValidation } from '../../../types';

type NewProjectDialogProps = {
  onClose: () => void;
  onCreate: (options: NewProjectOptions) => Promise<void>;
  onSelectLocation: () => Promise<string | undefined>;
  onValidate: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
  open: boolean;
};

const DEFAULT_PROJECT_VALIDATION: ProjectCreationValidation = { isAvailable: false };

const NewProjectDialog: FC<NewProjectDialogProps> = ({ onClose, onCreate, onSelectLocation, onValidate, open }) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [validation, setValidation] = useState<ProjectCreationValidation>(DEFAULT_PROJECT_VALIDATION);
  const isCreateDisabled = !name.trim() || !parentPath || !validation.isAvailable;

  useEffect(() => {
    if (!name.trim() || !parentPath) return;
    let isCurrent = true;
    void onValidate({ name: name.trim(), parentPath }).then((result) => isCurrent && setValidation(result));
    return () => { isCurrent = false; };
  }, [name, onValidate, parentPath]);

  const handleSelectLocation = useCallback(async () => {
    const location = await onSelectLocation();
    if (location) {
      setParentPath(location);
      setValidation(DEFAULT_PROJECT_VALIDATION);
    }
  }, [onSelectLocation]);
  
  const handleCreate = useCallback(async () => {
    if (!name.trim() || !parentPath) {
      setError(t('project.validation'));
      return;
    }

    try {
      await onCreate({ name: name.trim(), parentPath });
      setError('');
      setName('');
      setParentPath('');
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('project.error'));
    }
  }, [name, onClose, onCreate, parentPath, t]);

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
          onChange={(event) => {
            setName(event.target.value);
            setValidation(DEFAULT_PROJECT_VALIDATION);
          }}
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
