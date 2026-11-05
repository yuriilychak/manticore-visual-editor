import { type FC, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Slider, type SliderProps, Typography } from '@mui/material';

import { SLIDER_CONFIG_BY_ID } from './constants';
import type { ControlProps, SliderControlId } from './types';

const SliderControl: FC<ControlProps> = ({ disabled = false, id, max: maxOverride, onChange, value }) => {
  const { t } = useTranslation();
  const { max: configuredMax, min } = SLIDER_CONFIG_BY_ID[id as SliderControlId];
  const max = maxOverride ?? configuredMax;
  const label = t(`details.${id}`);
  const sliderValue = value as number;
  const marks = useMemo(
    () =>
      [min, sliderValue, max]
        .filter((mark, index, values) => values.indexOf(mark) === index)
        .map((mark) => ({ label: String(mark), value: mark })),
    [max, min, sliderValue]
  );
  const handleChange: SliderProps['onChange'] = (_event, nextValue) => {
    if (typeof nextValue === 'number') onChange(id, nextValue);
  };

  return (
    <Box pr={1} width="100%">
      <Typography component="label" htmlFor={id} variant="body2">
        {label}
      </Typography>
      <Slider
        aria-label={label}
        disabled={disabled}
        id={id}
        marks={marks}
        max={max}
        min={min}
        onChange={handleChange}
        size="small"
        sx={{ '& .MuiSlider-markLabel': { mt: '-8px' }, mb: '4px', mt: '-8px' }}
        value={sliderValue}
        valueLabelDisplay="off"
      />
    </Box>
  );
};

export default memo(SliderControl);
