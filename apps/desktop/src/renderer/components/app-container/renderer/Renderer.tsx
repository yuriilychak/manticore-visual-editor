import { type FC, useCallback, useEffect, useState } from 'react';

import { Box, Fade } from '@mui/material';

import { initializeI18n } from '../../../i18n';
import type { ApplicationAction } from '../../../types';

import { App } from './app';
import { SPLASH_TRANSITION_DURATION } from './constants';
import { SplashScreen } from './splash-screen';

type RendererProps = {
  onAction: (action: ApplicationAction) => void;
};

const Renderer: FC<RendererProps> = ({ onAction }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasLocalizationError, setHasLocalizationError] = useState(false);
  const [showApp, setShowApp] = useState(false);

  const loadLocalization = useCallback(() => {
    void initializeI18n()
      .then(() => setIsReady(true))
      .catch(() => setHasLocalizationError(true));
  }, []);

  const handleRetry = useCallback(() => {
    setHasLocalizationError(false);
    loadLocalization();
  }, [loadLocalization]);

  useEffect(() => {
    loadLocalization();
  }, [loadLocalization]);

  if (showApp) {
    return (
      <Fade appear in timeout={SPLASH_TRANSITION_DURATION}>
        <Box display="flex" flexDirection="column" flexGrow={1}>
          <App onAction={onAction} />
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in={!isReady} onExited={() => setShowApp(true)} timeout={SPLASH_TRANSITION_DURATION}>
      <Box display="flex" flexDirection="column" flexGrow={1}>
        <SplashScreen hasError={hasLocalizationError} onRetry={handleRetry} />
      </Box>
    </Fade>
  );
};

export default Renderer;
