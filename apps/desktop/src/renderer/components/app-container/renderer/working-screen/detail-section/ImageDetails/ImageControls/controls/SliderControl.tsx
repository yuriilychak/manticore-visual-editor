import { type FC, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Slider, type SliderProps } from '@mui/material';

import type { ControlProps, SliderControlId } from '../types';

import { SLIDER_CONFIG_BY_ID, SLIDER_SX } from './constants';
import ControlLabel from './ControlLabel';
import { getSliderMarks } from './helpers';

const SliderControl: FC<ControlProps> = ({ disabled = false, id, onChange, value }) => {
  const { t } = useTranslation();
  const { max, min } = SLIDER_CONFIG_BY_ID[id as SliderControlId];
  const label = t(`details.${id}`);
  const sliderValue = value as number;
  const marks = useMemo(() => getSliderMarks([min, sliderValue, max]), [max, min, sliderValue]);
  const handleChange: SliderProps['onChange'] = (_event, nextValue) => {
    if (typeof nextValue === 'number') onChange(id, nextValue);
  };

  return (
    <ControlLabel htmlFor={id} id={id}>
      <Slider
        aria-label={label}
        disabled={disabled}
        id={id}
        marks={marks}
        max={max}
        min={min}
        onChange={handleChange}
        size="small"
        sx={SLIDER_SX}
        value={sliderValue}
        valueLabelDisplay="off"
      />
    </ControlLabel>
  );
};

export default memo(SliderControl);
