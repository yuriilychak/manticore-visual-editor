import type { ContentStrategyResult } from './types';

export const notifyUnavailableDesktopApi = () => window.alert('This feature is unavailable outside the desktop app.');

export const createErrorResult = (reason: unknown, fallbackMessage: string): ContentStrategyResult => ({
  action: 'show-notification',
  message: reason instanceof Error ? reason.message : fallbackMessage
});
