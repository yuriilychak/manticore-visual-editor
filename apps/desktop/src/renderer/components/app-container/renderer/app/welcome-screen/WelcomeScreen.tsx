import type { FC } from 'react';

import { Box, Typography } from '@mui/material';

import type { ApplicationAction } from '../../../../../types';
import { withLocalizedProps } from '../../../../localization/withLocalizedProps';

import { HELP_ACTIONS, LEARN_ACTIONS, START_ACTIONS, WELCOME_SCREEN_LOCALE_KEYS } from './constants';
import type { WelcomeScreenLocalizedProps } from './types';
import { WelcomeSection } from './welcome-section';

type WelcomeScreenProps = {
  onAction: (action: ApplicationAction) => void;
};

const WelcomeScreen: FC<WelcomeScreenProps & WelcomeScreenLocalizedProps> = ({
  helpTitle,
  learnTitle,
  onAction,
  startTitle,
  subtitle,
  title
}) => {

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
          {title}
        </Typography>
        <Typography color="text.secondary" mb={6} mt={1} variant="body1">
          {subtitle}
        </Typography>

        <Box alignItems="stretch" display="grid" gap={3} gridTemplateColumns={{ md: 'repeat(2, minmax(0, 1fr))' }}>
          <WelcomeSection
            actionSize="large"
            actions={START_ACTIONS}
            iconSize="medium"
            onAction={onAction}
            title={startTitle}
          />
          <Box display="flex" flexDirection="column" gap={3} minWidth={0}>
            <WelcomeSection actions={LEARN_ACTIONS} isExternal onAction={onAction} title={learnTitle} />
            <WelcomeSection actions={HELP_ACTIONS} onAction={onAction} title={helpTitle} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default withLocalizedProps(WELCOME_SCREEN_LOCALE_KEYS)(WelcomeScreen);
