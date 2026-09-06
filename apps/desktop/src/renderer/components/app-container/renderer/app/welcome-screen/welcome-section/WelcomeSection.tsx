import { type FC, type MouseEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';

import type { ApplicationAction } from '../../../../../../types';

import type { WelcomeAction } from '../types';

type WelcomeSectionProps = {
  actions: readonly WelcomeAction[];
  actionSize?: 'large' | 'medium' | 'small';
  iconSize?: 'large' | 'medium' | 'small';
  isExternal?: boolean;
  onAction: (action: ApplicationAction) => void;
  title: string;
};

const WelcomeSection: FC<WelcomeSectionProps> = ({
  actions,
  actionSize = 'medium',
  iconSize = 'small',
  isExternal = false,
  onAction,
  title
}) => {
  const { t } = useTranslation();
  const handleAction = useCallback(
    (event: MouseEvent<HTMLElement>) => onAction(event.currentTarget.dataset.action as ApplicationAction),
    [onAction]
  );

  return (
    <Paper elevation={0} sx={{ bgcolor: 'background.paper', minWidth: 0, p: 3 }}>
      <Typography fontWeight={600} variant="h6">
        {title}
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Box display="flex" flexDirection="column" gap={1}>
        {actions.map(({ action, Icon, labelKey }) => (
          <Button
            data-action={action}
            endIcon={isExternal ? <ArrowOutwardRounded fontSize={iconSize} /> : undefined}
            key={action}
            onClick={handleAction}
            size={actionSize}
            startIcon={<Icon fontSize={iconSize} />}
            sx={{ justifyContent: 'flex-start' }}
            variant="text"
          >
            {t(labelKey)}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};

export default WelcomeSection;
