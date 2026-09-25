import { createTheme } from '@mui/material';

export const THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: { contrastText: '#f5f8fb', dark: '#236f9f', light: '#66b8f0', main: '#3b9eea' },
    background: { default: '#242424', paper: '#353535' },
    divider: '#53575b',
    text: { primary: '#e7e9ed', secondary: '#b8bdc5' }
  },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          scrollbarColor: '#53575b #242424',
          scrollbarWidth: 'thin'
        },
        '*::-webkit-scrollbar': { height: 10, width: 10 },
        '*::-webkit-scrollbar-thumb': { backgroundColor: '#53575b', border: '2px solid #242424', borderRadius: 5 },
        '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#66b8f0' },
        '*::-webkit-scrollbar-track': { backgroundColor: '#242424' }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6, textTransform: 'none' }
      },
      variants: [{ props: { variant: 'text' }, style: { color: '#66b8f0' } }]
    },
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid #464646' }
      }
    }
  }
});
