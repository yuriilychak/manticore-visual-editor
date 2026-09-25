import { memo, type FC } from 'react';

import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';

import { ASSET_TYPE_LOCALE_KEY } from '../../../../types';

import type { NewContentStrategy } from '../types';
import { useNewContentDialog } from './useNewContentDialog';

type NewContentDialogProps = {
  onClose: () => void;
  open: boolean;
  strategy: NewContentStrategy;
};

const NewContentDialog: FC<NewContentDialogProps> = ({ onClose, open, strategy }) => {
  const { error, handleCreate, handleFieldSelect, onFieldChange, t, validation, values } = useNewContentDialog(strategy, onClose);
  const contentTypeLocaleKey = ASSET_TYPE_LOCALE_KEY[strategy.contentType];

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      slotProps={{ paper: { elevation: 0, sx: { bgcolor: 'background.paper' } } }}
    >
      <DialogTitle>{t(`${contentTypeLocaleKey}.title`)}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {strategy.fields.map((field, index) => {
          const hasValidationError = validation.fieldKey === field.key && Boolean(validation.reason);

          return (
            <TextField
              autoFocus={index === 0}
              error={hasValidationError}
              fullWidth
              key={field.key}
              label={t(`${contentTypeLocaleKey}.${field.key}`)}
              margin="dense"
              onChange={(event) => onFieldChange(event.target.value, field.key)}
              size="small"
              slotProps={field.selectValue ? {
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={t(`${contentTypeLocaleKey}.selectLocation`)}>
                        <IconButton
                          aria-label={t(`${contentTypeLocaleKey}.selectLocation`)}
                          edge="end"
                          onClick={() => void handleFieldSelect(field.key, field.selectValue!)}
                          size="small"
                        >
                          <FolderOpenRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                  readOnly: true
                }
              } : undefined}
              helperText={hasValidationError ? t(`${contentTypeLocaleKey}.${validation.reason}`) : undefined}
              value={values[field.key] ?? ''}
            />
          );
        })}
        {validation.reason && !validation.fieldKey && <Alert severity="warning" sx={{ mt: 1 }}>{t(`${contentTypeLocaleKey}.${validation.reason}`)}</Alert>}
      </DialogContent>
      <DialogActions sx={{ pb: 3, px: 3 }}>
        <Button onClick={onClose}>{t(`${contentTypeLocaleKey}.cancel`)}</Button>
        <Button disabled={!validation.isValid} onClick={handleCreate} variant="contained">
          {t(`${contentTypeLocaleKey}.create`)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(NewContentDialog);
