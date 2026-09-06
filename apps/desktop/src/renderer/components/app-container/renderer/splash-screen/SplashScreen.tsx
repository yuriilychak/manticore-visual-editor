import type { FC } from 'react';

import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';

type SplashScreenProps = {
  hasError?: boolean;
  onRetry?: () => void;
};

const SplashScreen: FC<SplashScreenProps> = ({ hasError = false, onRetry }) => {
  if (hasError) {
    return (
      <Box
        alignItems="center"
        bgcolor="background.default"
        display="flex"
        flexDirection="column"
        flexGrow={1}
        gap={2}
        justifyContent="center"
      >
        <Alert severity="error">Could not load the application language.</Alert>
        <Button onClick={onRetry} variant="contained">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box
      alignItems="center"
      bgcolor="background.default"
      display="flex"
      flexDirection="column"
      flexGrow={1}
      gap={2}
      justifyContent="center"
    >
      <CircularProgress aria-label="Loading application" size={44} />
      <Typography color="text.secondary" variant="body2">
        Loading Manticore…
      </Typography>
    </Box>
  );
};

export default SplashScreen;
