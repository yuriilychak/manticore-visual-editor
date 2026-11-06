import { type FC, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Slider, type SliderProps } from '@mui/material';

import { SLIDER_CONFIG_BY_ID } from './constants';
import ControlLabel from './ControlLabel';
import type { ControlProps, SliderControlId } from './types';

const SliderControl: FC<ControlProps> = ({ disabled = false, id, onChange, value }) => {
  const { t } = useTranslation();
  const { max, min } = SLIDER_CONFIG_BY_ID[id as SliderControlId];
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
        sx={{ '& .MuiSlider-markLabel': { fontSize: '0.75rem', mt: '-8px' }, mb: '4px', mt: '-8px' }}
        value={sliderValue}
        valueLabelDisplay="off"
      />
    </ControlLabel>
  );
};

export default memo(SliderControl);
