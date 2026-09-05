import { createTheme } from '@mui/material';

export const THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: { contrastText: '#f5f8fb', dark: '#236f9f', main: '#3b9eea' },
    background: { default: '#242424', paper: '#353535' },
    divider: '#53575b',
    text: { primary: '#e7e9ed', secondary: '#b8bdc5' }
  },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6, textTransform: 'none' }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid #464646' }
      }
    }
  }
});
