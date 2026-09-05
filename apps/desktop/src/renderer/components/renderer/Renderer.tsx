import { type FC, useCallback, useEffect, useState } from 'react';

import { initializeI18n } from '../../i18n';

import App from '../app/App';
import SplashScreen from '../splash-screen/SplashScreen';

const Renderer: FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [hasLocalizationError, setHasLocalizationError] = useState(false);

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

  return isReady ? <App /> : <SplashScreen hasError={hasLocalizationError} onRetry={handleRetry} />;
};

export default Renderer;
