import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { AppContainer } from './components';
import { THEME } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={THEME}>
      <CssBaseline />
      <AppContainer />
    </ThemeProvider>
  </StrictMode>
);
