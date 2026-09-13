import i18n, { type TFunction } from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const I18N_OPTIONS = {
  lng: new URLSearchParams(window.location.search).get('language') ?? 'en',
  fallbackLng: 'en',
  backend: {
    loadPath: './locales/{{lng}}.json'
  },
  interpolation: { escapeValue: false }
};

let initialization: Promise<TFunction> | null = null;

export const initializeI18n = async (): Promise<void> => {
  if (i18n.isInitialized) {
    await i18n.reloadResources();
    return;
  }

  try {
    initialization ??= i18n
      .use(HttpBackend)
      .use(initReactI18next)
      .init(I18N_OPTIONS);
    await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
};

export default i18n;
