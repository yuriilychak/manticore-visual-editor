import { ContentAction } from '../common';
import type { NotificationError } from '../constants';
import type { ContentStrategyResult } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const createErrorResult = (id: number, error: NotificationError): ContentStrategyResult =>
  new ContentAction(id, 'show-notification', { error });
