import { type ChangeEvent, type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FormControlLabel, Switch } from '@mui/material';

import type { ControlId, ControlProps } from './types';

const ToggleControl: FC<ControlProps> = ({ disabled = false, id, onChange, value }) => {
  const { t } = useTranslation();
  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>, value: boolean) => onChange(target.id as ControlId, value);

  return (
    <FormControlLabel
      control={<Switch checked={value as boolean} disabled={disabled} id={id} onChange={handleChange} size="small" />}
      label={t(`details.${id}`)}
      sx={{ m: 0, ml: '-8px' }}
    />
  );
};

export default memo(ToggleControl);
