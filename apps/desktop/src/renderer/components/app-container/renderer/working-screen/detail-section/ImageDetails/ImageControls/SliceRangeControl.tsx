import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Slider } from '@mui/material';

import { SLICE_RANGE_LABEL_IDS } from './constants';
import ControlLabel from './ControlLabel';
import type { ControlProps, SliceControlId } from './types';

const SliceRangeControl: FC<ControlProps> = ({ data, id, onChange, value }) => {
  const { t } = useTranslation();
  const sliceId = id as SliceControlId;
  const [startId, endId] = SLICE_RANGE_LABEL_IDS[sliceId];
  const [startValue, endValue] = value as [number, number];
  const max = typeof data === 'number' ? data : 1;
  const endPosition = max - endValue;
  const startLabel = t(`details.${startId}`);
  const endLabel = t(`details.${endId}`);
  
  return <ControlLabel id={[startId, endId]}>
    <Slider
      aria-label={`${startLabel} / ${endLabel}`}
      marks={[0, startValue, endPosition, max].filter((value, index, values) => values.indexOf(value) === index).map((value) => ({ label: String(value), value }))}
      max={max}
      min={0}
      onChange={(_event, value) => { if (Array.isArray(value)) onChange(sliceId, [value[0], max - value[1]]); }}
      size="small"
      sx={{ '& .MuiSlider-markLabel': { fontSize: '0.75rem', mt: '-8px' }, mb: '4px', mt: '-8px' }}
      value={[startValue, endPosition]}
      valueLabelDisplay="off"
    />
  </ControlLabel>;
};

export default memo(SliceRangeControl);
