import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { Box, Button, Typography } from '@mui/material';

import { HELP_ACTIONS, LEARN_ACTIONS, START_ACTIONS } from './constants';
import WelcomeSection from './welcome-section/WelcomeSection';

const App: FC = () => {
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
          <WelcomeSection title={t('welcome.start')}>
            <Box display="flex" flexDirection="column" gap={1} mt={2}>
              {START_ACTIONS.map(({ Icon, labelKey }) => (
                <Button
                  key={labelKey}
                  size="large"
                  startIcon={<Icon />}
                  sx={{ justifyContent: 'flex-start' }}
                  variant="text"
                >
                  {t(labelKey)}
                </Button>
              ))}
            </Box>
          </WelcomeSection>

          <Box display="flex" flexDirection="column" gap={3} minWidth={0}>
            <WelcomeSection title={t('welcome.learn')}>
              <Box display="flex" flexDirection="column" mt={1}>
                {LEARN_ACTIONS.map(({ Icon, labelKey }) => (
                  <Button
                    endIcon={<ArrowOutwardRounded fontSize="small" />}
                    key={labelKey}
                    startIcon={<Icon fontSize="small" />}
                    sx={{ justifyContent: 'flex-start' }}
                    variant="text"
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </Box>
            </WelcomeSection>

            <WelcomeSection title={t('welcome.help')}>
              <Box display="flex" flexDirection="column">
                {HELP_ACTIONS.map(({ Icon, labelKey }) => (
                  <Button
                    key={labelKey}
                    startIcon={<Icon fontSize="small" />}
                    sx={{ justifyContent: 'flex-start' }}
                    variant="text"
                  >
                    {t(labelKey)}
                  </Button>
                ))}
              </Box>
            </WelcomeSection>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
