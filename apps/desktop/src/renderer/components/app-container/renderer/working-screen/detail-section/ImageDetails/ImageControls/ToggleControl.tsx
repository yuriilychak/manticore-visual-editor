import { type ChangeEvent, type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@mui/material';

import ControlLabel from './ControlLabel';
import type { ControlId, ControlProps } from './types';

const ToggleControl: FC<ControlProps> = ({ disabled = false, id, onChange, value }) => {
  const { t } = useTranslation();
  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>, value: boolean) => onChange(target.id as ControlId, value);

  return (
    <ControlLabel centered htmlFor={id} id={id}>
      <Switch aria-label={t(`details.${id}`)} checked={value as boolean} disabled={disabled} id={id} onChange={handleChange} size="small" sx={{ mt: -0.5 }} />
    </ControlLabel>
  );
};

export default memo(ToggleControl);
