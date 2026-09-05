import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Paper, Typography } from '@mui/material';

const App: FC = () => {
  const { t } = useTranslation();

  return (
    <Box component="main" display="grid" flexGrow={1} px={3} py={6} sx={{ placeContent: 'center' }}>
      <Paper elevation={8} sx={{ maxWidth: 640, p: { xs: 3, sm: 6 } }}>
        <Typography color="primary" fontWeight={700} letterSpacing=".12em" textTransform="uppercase" variant="overline">
          {t('app.productName')}
        </Typography>
        <Typography component="h1" gutterBottom variant="h2">
          {t('app.title')}
        </Typography>
        <Typography color="text.secondary" paragraph variant="body1">
          {t('app.description')}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {t('app.platform', { platform: window.manticore?.platform ?? 'the web preview' })}
        </Typography>
      </Paper>
    </Box>
  );
};

export default App;
