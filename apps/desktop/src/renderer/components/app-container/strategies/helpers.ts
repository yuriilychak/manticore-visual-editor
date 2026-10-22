import { ContentAction } from '../common';
import { NOTIFICATION_LOCALE_KEYS, type NotificationError } from '../constants';

import type { ContentStrategyResult } from './types';

export const createErrorResult = (id: number, error: NotificationError): ContentStrategyResult =>
  new ContentAction(id, 'show-notification', { notification: { message: NOTIFICATION_LOCALE_KEYS[error], type: 'error' as const } });
