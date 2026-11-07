import type { SxProps, Theme } from '@mui/material';

import type { SliceControlId, SliderControlId } from '../types';

export const CENTERED_CONTROL_LABEL_PROPS = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column'
} as const;

export const DEFAULT_CONTROL_LABEL_PROPS = {
  pr: 1,
  width: '100%'
} as const;

export const SLIDER_SX: SxProps<Theme> = {
  '& .MuiSlider-markLabel': { fontSize: '0.75rem', mt: '-8px' },
  mb: '4px',
  mt: '-8px'
};

export const SLIDER_CONFIG_BY_ID: Record<SliderControlId, { max: number; min: number }> = {
  alphaThreshold: { max: 254, min: 0 },
  pointCount: { max: 32, min: 5 },
  minimalDistance: { max: 255, min: 1 }
};

export const SLICE_RANGE_LABEL_IDS: Record<SliceControlId, readonly [string, string]> = {
  sliceHorizontal: ['sliceLeft', 'sliceRight'],
  sliceVertical: ['sliceTop', 'sliceBottom']
};
