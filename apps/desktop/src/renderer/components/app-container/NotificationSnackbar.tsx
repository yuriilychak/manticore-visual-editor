import { type FC,memo } from 'react';

import { Snackbar, Stack } from '@mui/material';

import NotificationAlert from './NotificationAlert';
import type { Notification } from './types';

type NotificationSnackbarProps = {
  notifications: readonly Notification[];
  onClose: (id: string) => void;
};

const NotificationSnackbar: FC<NotificationSnackbarProps> = ({ notifications, onClose }) => {
  return (
    <Snackbar anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} open={notifications.length > 0}>
      <Stack spacing={1}>
        {notifications.map((notification) => (
          <NotificationAlert key={notification.id} notification={notification} onClose={onClose} />
        ))}
      </Stack>
    </Snackbar>
  );
};

export default memo(NotificationSnackbar);
