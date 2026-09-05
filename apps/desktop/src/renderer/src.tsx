import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import AppShell from './components/app-shell/AppShell';
import Renderer from './components/renderer/Renderer';
import { THEME } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={THEME}>
      <CssBaseline />
      <AppShell controls={window.manticore?.windowControls}>
        <Renderer />
      </AppShell>
    </ThemeProvider>
  </StrictMode>
);
