import { type FC, useCallback, useEffect, useState } from 'react';

import { Box, Fade } from '@mui/material';

import type { ProjectActionHandler } from '../../../../types';
import { initializeI18n } from '../../../localization';
import type { ApplicationAction } from '../../../types';

import { App } from './app';
import { SPLASH_TRANSITION_DURATION } from './constants';
import { SplashScreen } from './splash-screen';

type RendererProps = {
  onAction: (action: ApplicationAction) => void;
  onWorkingScreenAction: ProjectActionHandler;
  projectName?: string;
  projectPath: string;
};

const Renderer: FC<RendererProps> = ({ onAction, onWorkingScreenAction, projectName, projectPath }) => {
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
        <App
          onAction={onAction}
          onWorkingScreenAction={onWorkingScreenAction}
          projectName={projectName}
          projectPath={projectPath}
        />
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
