import type { ApplicationAction } from '../../../../../types';

export type FileMenuItem = {
  action: ApplicationAction;
  labelKey: string;
};

export type LanguageMenuItem = {
  code: string;
  labelKey: string;
};
