import { type FC, useCallback, useEffect, useState } from 'react';

import { Box, Fade } from '@mui/material';

import { initializeI18n } from '../../../localization';
import { useProjectStructure } from '../ProjectStructureContext';

import { WelcomeScreen } from './welcome-screen';
import { WorkingScreen } from './working-screen';
import { SPLASH_TRANSITION_DURATION } from './constants';
import { SplashScreen } from './splash-screen';

const Renderer: FC = () => {
  const { project } = useProjectStructure();
  const [isReady, setReady] = useState(false);
  const [hasLocalizationError, setHasLocalizationError] = useState(false);
  const [showApp, setShowApp] = useState(false);

  const loadLocalization = useCallback(() => {
    void initializeI18n()
      .then(() => setReady(true))
      .catch(() => setHasLocalizationError(true));
  }, []);

  const handleRetry = useCallback(() => {
    setHasLocalizationError(false);
    loadLocalization();
  }, [loadLocalization]);
  const handleAppExited = useCallback(() => setShowApp(true), []);

  useEffect(() => {
    loadLocalization();
  }, [loadLocalization]);

  return showApp ? (
    <Fade appear in timeout={SPLASH_TRANSITION_DURATION}>
      <Box display="flex" flexDirection="column" flexGrow={1}>
        {project?.path ? <WorkingScreen /> : <WelcomeScreen />}
      </Box>
    </Fade>
  ) : (
    <Fade in={!isReady} onExited={handleAppExited} timeout={SPLASH_TRANSITION_DURATION}>
      <Box display="flex" flexDirection="column" flexGrow={1}>
        <SplashScreen hasError={hasLocalizationError} onRetry={handleRetry} />
      </Box>
    </Fade>
  );
};

export default Renderer;
