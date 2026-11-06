import type { ControlId, ControlType, SliceControlId, SliderControlId, ToggleControlId } from './types';

export const SLIDER_CONFIG_BY_ID: Record<SliderControlId, { max: number; min: number }> = {
  alphaThreshold: { max: 254, min: 0 },
  pointCount: { max: 32, min: 5 },
  minimalDistance: { max: 255, min: 1 }
};

export const SLIDER_IDS: readonly SliderControlId[] = ['alphaThreshold', 'pointCount', 'minimalDistance'];

export const SLICE_RANGE_CONTROL_IDS: readonly SliceControlId[] = ['sliceHorizontal', 'sliceVertical'];

export const SLICE_RANGE_LABEL_IDS: Record<SliceControlId, readonly [string, string]> = {
  sliceHorizontal: ['sliceLeft', 'sliceRight'],
  sliceVertical: ['sliceTop', 'sliceBottom']
};

export const TOGGLE_IDS: readonly ToggleControlId[] = ['usePolygonsInsteadOfQuads', 'slice9', 'transparentPadding', 'colorMargin'];

export const CONTROL_IDS: readonly ControlId[] = [...TOGGLE_IDS, ...SLIDER_IDS, ...SLICE_RANGE_CONTROL_IDS];

export const CONTROL_TYPE_BY_ID: Record<ControlId, ControlType> = {
  alphaThreshold: 'slider',
  colorMargin: 'toggle',
  minimalDistance: 'slider',
  pointCount: 'slider',
  slice9: 'toggle',
  sliceHorizontal: 'sliceRange',
  sliceVertical: 'sliceRange',
  transparentPadding: 'toggle',
  usePolygonsInsteadOfQuads: 'toggle'
};
