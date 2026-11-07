import { type Dispatch, type FC, memo, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Switch, type SwitchProps, Typography } from '@mui/material';

import type { PreviewToggleId } from './constants';

type PreviewToggleProps = {
  checked: boolean;
  id: PreviewToggleId;
  setCheckedByToggleId: Dispatch<SetStateAction<Record<PreviewToggleId, boolean>>>;
};

const PreviewToggle: FC<PreviewToggleProps> = ({ checked, id, setCheckedByToggleId }) => {
  const { t } = useTranslation();
  const onChange: NonNullable<SwitchProps['onChange']> = (_event, value) => setCheckedByToggleId((current) => ({ ...current, [id]: value }));

  return (
    <Box alignItems="center" display="flex" flexDirection="column">
      <Typography lineHeight={1} variant="caption">{t(`details.${id}`)}</Typography>
      <Switch checked={checked} onChange={onChange} size="small" sx={{ mt: -0.5 }} />
    </Box>
  );
};

export default memo(PreviewToggle);
