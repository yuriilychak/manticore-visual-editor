import { createTheme } from '@mui/material';

export const THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#c4aeff' },
    background: { default: '#17131f', paper: '#241d31' }
  },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }
});
