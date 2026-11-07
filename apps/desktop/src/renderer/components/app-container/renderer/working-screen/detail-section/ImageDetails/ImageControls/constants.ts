import type { ControlData, ControlId, ControlType, SliceControlId, SliderControlId, ToggleControlId } from './types';

export const DEFAULT_CONTROL_DATA: ControlData = { max: 1 };

export const SLIDER_IDS: readonly SliderControlId[] = ['alphaThreshold', 'pointCount', 'minimalDistance'];

export const SLICE_RANGE_CONTROL_IDS: readonly SliceControlId[] = ['sliceHorizontal', 'sliceVertical'];

export const TOGGLE_IDS: readonly ToggleControlId[] = ['usePolygonsInsteadOfQuads', 'slice9', 'transparentPadding', 'colorMargin'];

export const POLYGON_GENERATION_HIDDEN_CONTROL_IDS: readonly ToggleControlId[] = ['slice9', 'transparentPadding', 'colorMargin'];

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
