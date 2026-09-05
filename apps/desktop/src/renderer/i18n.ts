import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const I18N_OPTIONS = {
  lng: 'en',
  fallbackLng: 'en',
  backend: {
    loadPath: './locales/{{lng}}.json'
  },
  interpolation: { escapeValue: false }
};

let initialization: Promise<unknown> | undefined;

export const initializeI18n = () => {
  if (i18n.isInitialized) return i18n.reloadResources();

  initialization ??= i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init(I18N_OPTIONS)
    .catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });

  return initialization;
};

export const I18N_READY = initializeI18n();

export default i18n;
