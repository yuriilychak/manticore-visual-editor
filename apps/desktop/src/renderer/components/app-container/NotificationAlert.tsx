import { type FC,memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@mui/material';

import type { Notification } from './types';

type NotificationAlertProps = {
  notification: Notification;
  onClose: (id: string) => void;
};

const NotificationAlert: FC<NotificationAlertProps> = ({ notification, onClose }) => {
  const { t } = useTranslation();
  const { data, id, message, type } = notification;
  const handleClose = () => onClose(id);

  return (
    <Alert id="Test" onClose={handleClose} severity={type} sx={{ width: '100%' }} variant="filled">
      {t(message, data)}
    </Alert>
  );
};

export default memo(NotificationAlert);
