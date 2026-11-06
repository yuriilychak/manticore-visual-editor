import { type FC, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import HelpIcon from '@mui/icons-material/Help';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';

type ControlLabelProps = {
  centered?: boolean;
  children: ReactNode;
  htmlFor?: string;
  id: string | readonly string[];
};

const ControlLabel: FC<ControlLabelProps> = ({ centered = false, children, htmlFor, id }) => {
  const { t } = useTranslation();
  const ids = Array.isArray(id) ? id : [id];

  return <Box alignItems={centered ? 'center' : undefined} display={centered ? 'flex' : undefined} flexDirection={centered ? 'column' : undefined} pr={centered ? undefined : 1} width={centered ? undefined : '100%'}>
    <Box alignItems="center" display="flex" justifyContent={ids.length > 1 ? 'space-between' : undefined} width="100%">
      {ids.map((controlId) => {
        const label = t(`details.${controlId}`);
        return <Box alignItems="center" display="flex" gap={0.25} key={controlId}>
          <Typography component={htmlFor ? 'label' : 'span'} htmlFor={htmlFor} lineHeight={1} variant="caption">{label}</Typography>
          <Tooltip title={t(`details.controlHelp.${controlId}`)}><IconButton aria-label={`${label} help`} disableRipple size="small" sx={{ borderRadius: 0, minWidth: 0, p: 0 }}><HelpIcon sx={{ fontSize: '0.75rem' }} /></IconButton></Tooltip>
        </Box>;
      })}
    </Box>
    {children}
  </Box>;
};

export default ControlLabel;
