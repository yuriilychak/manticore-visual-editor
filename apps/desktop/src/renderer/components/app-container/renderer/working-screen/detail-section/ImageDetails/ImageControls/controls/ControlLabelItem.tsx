import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import HelpIcon from '@mui/icons-material/Help';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';

type ControlLabelItemProps = {
  htmlFor?: string;
  id: string;
};

const ControlLabelItem: FC<ControlLabelItemProps> = ({ htmlFor, id }) => {
  const { t } = useTranslation();
  const label = t(`details.${id}`);

  return <Box alignItems="center" display="flex" gap={0.25}>
    <Typography component={htmlFor ? 'label' : 'span'} htmlFor={htmlFor} lineHeight={1} variant="caption">{label}</Typography>
    <Tooltip title={t(`details.controlHelp.${id}`)}><IconButton aria-label={`${label} help`} disableRipple size="small" sx={{ borderRadius: 0, minWidth: 0, p: 0 }}><HelpIcon sx={{ fontSize: '0.75rem' }} /></IconButton></Tooltip>
  </Box>;
};

export default ControlLabelItem;
