import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import type { ApplicationAction } from '../../../../types';

import { HELP_ACTIONS, LEARN_ACTIONS, START_ACTIONS } from './constants';
import { WelcomeSection } from './welcome-section';

type AppProps = {
  onAction: (action: ApplicationAction) => void;
};

const App: FC<AppProps> = ({ onAction }) => {
  const { t } = useTranslation();

  return (
    <Box
      component="main"
      display="flex"
      flexDirection="column"
      flexGrow={1}
      px={{ xs: 3, sm: 6 }}
      py={{ xs: 5, sm: 8 }}
    >
      <Box display="flex" flexDirection="column" flexGrow={1} width="100%">
        <Typography component="h1" fontWeight={600} variant="h3">
          {t('welcome.title')}
        </Typography>
        <Typography color="text.secondary" mb={6} mt={1} variant="body1">
          {t('welcome.subtitle')}
        </Typography>

        <Box alignItems="stretch" display="grid" gap={3} gridTemplateColumns={{ md: 'repeat(2, minmax(0, 1fr))' }}>
          <WelcomeSection
            actionSize="large"
            actions={START_ACTIONS}
            iconSize="medium"
            onAction={onAction}
            title={t('welcome.start')}
          />
          <Box display="flex" flexDirection="column" gap={3} minWidth={0}>
            <WelcomeSection actions={LEARN_ACTIONS} isExternal onAction={onAction} title={t('welcome.learn')} />
            <WelcomeSection actions={HELP_ACTIONS} onAction={onAction} title={t('welcome.help')} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
