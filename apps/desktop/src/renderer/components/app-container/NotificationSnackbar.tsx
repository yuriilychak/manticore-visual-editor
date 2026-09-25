import { memo, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Snackbar } from '@mui/material';

import { NOTIFICATION_LOCALE_KEYS, type NotificationError } from './constants';

type NotificationSnackbarProps = {
  error: NotificationError;
  onClose: () => void;
};

const NotificationSnackbar: FC<NotificationSnackbarProps> = ({ error, onClose }) => {
  const { t } = useTranslation();

  return (
    <Snackbar
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      autoHideDuration={5000}
      onClose={onClose}
      open={Boolean(error)}
    >
      <Alert onClose={onClose} severity="error" sx={{ width: '100%' }} variant="filled">
        {t(NOTIFICATION_LOCALE_KEYS[error])}
      </Alert>
    </Snackbar>
  );
};

export default memo(NotificationSnackbar);
