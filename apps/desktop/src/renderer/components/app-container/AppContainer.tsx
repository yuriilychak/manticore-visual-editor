import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApplicationAction } from '../../types';

import { AppShell } from './app-shell';
import { SELECTED_ACTION_IDS_BY_LANGUAGE } from './constants';
import { Renderer } from './renderer';

const AppContainer: FC = () => {
  const { i18n } = useTranslation();
  const selectedActionIds = SELECTED_ACTION_IDS_BY_LANGUAGE[i18n.language] ?? [];

  const handleAction = useCallback(
    (action: ApplicationAction) => {
      switch (action) {
        case 'set-language-en':
          void i18n.changeLanguage('en');
          break;
        case 'set-language-es':
          void i18n.changeLanguage('es');
          break;
        default:
          void action;
      }
    },
    [i18n]
  );

  return (
    <AppShell controls={window.manticore?.windowControls} onAction={handleAction} selectedActionIds={selectedActionIds}>
      <Renderer onAction={handleAction} />
    </AppShell>
  );
};

export default AppContainer;
