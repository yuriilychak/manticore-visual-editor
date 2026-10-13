import { ContentAction } from '../common';
import type { NotificationError } from '../constants';

import type { ContentStrategyResult } from './types';

export const createErrorResult = (id: number, error: NotificationError): ContentStrategyResult =>
  new ContentAction(id, 'show-notification', { error });
