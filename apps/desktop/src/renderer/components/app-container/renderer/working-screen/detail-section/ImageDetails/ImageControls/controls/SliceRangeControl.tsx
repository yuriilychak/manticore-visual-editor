import { type FC, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Slider, type SliderProps } from '@mui/material';

import type { ControlData, ControlProps, SliceControlId } from '../types';

import { SLICE_RANGE_LABEL_IDS, SLIDER_SX } from './constants';
import ControlLabel from './ControlLabel';
import { getSliderMarks } from './helpers';

const SliceRangeControl: FC<ControlProps<ControlData>> = ({ data, id, onChange, value }) => {
  const { t } = useTranslation();
  const [startId, endId] = SLICE_RANGE_LABEL_IDS[id as SliceControlId];
  const [startValue, endValue] = value as [number, number];
  const { max } = data;
  const endPosition = max - endValue;
  const startLabel = t(`details.${startId}`);
  const endLabel = t(`details.${endId}`);
  const marks = getSliderMarks([0, startValue, endPosition, max]);
  const handleChange = useCallback<NonNullable<SliderProps['onChange']>>((_event, nextValue) => {
    if (Array.isArray(nextValue)) onChange(id, [nextValue[0], max - nextValue[1]]);
  }, [max, onChange, id]);
  
  return <ControlLabel id={[startId, endId]}>
    <Slider
      aria-label={`${startLabel} / ${endLabel}`}
      marks={marks}
      max={max}
      min={0}
      onChange={handleChange}
      size="small"
      sx={SLIDER_SX}
      value={[startValue, endPosition]}
      valueLabelDisplay="off"
    />
  </ControlLabel>;
};

export default memo(SliceRangeControl);
