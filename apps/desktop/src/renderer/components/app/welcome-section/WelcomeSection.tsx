import type { FC, ReactNode } from 'react';

import { Divider, Paper, Typography } from '@mui/material';

type WelcomeSectionProps = {
  children: ReactNode;
  title: string;
};

const WelcomeSection: FC<WelcomeSectionProps> = ({ children, title }) => {
  return (
    <Paper elevation={0} sx={{ bgcolor: 'background.paper', minWidth: 0, p: 3 }}>
      <Typography fontWeight={600} variant="h6">
        {title}
      </Typography>
      <Divider sx={{ my: 4 }} />
      {children}
    </Paper>
  );
};

export default WelcomeSection;
