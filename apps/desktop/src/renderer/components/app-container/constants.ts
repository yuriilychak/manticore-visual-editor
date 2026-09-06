import type { ApplicationAction } from '../../types';

export const SELECTED_ACTION_IDS_BY_LANGUAGE: Readonly<Record<string, readonly ApplicationAction[]>> = {
  en: ['set-language-en'],
  es: ['set-language-es']
};
