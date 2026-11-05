import type { ControlId, SliderControlId, ToggleControlId } from './types';

export const SLIDER_CONFIG_BY_ID: Record<SliderControlId, { max: number; min: number }> = {
  alphaThreshold: { max: 254, min: 0 },
  pointCount: { max: 32, min: 5 },
  minimalDistance: { max: 255, min: 1 },
  sliceBottom: { max: 1, min: 0 },
  sliceLeft: { max: 1, min: 0 },
  sliceRight: { max: 1, min: 0 },
  sliceTop: { max: 1, min: 0 }
};

export const SLIDER_IDS: readonly SliderControlId[] = ['alphaThreshold', 'pointCount', 'minimalDistance', 'sliceLeft', 'sliceRight', 'sliceTop', 'sliceBottom'];

export const TOGGLE_IDS: readonly ToggleControlId[] = ['showTriangles', 'showPolygon', 'usePolygonsInsteadOfQuads', 'slice9', 'showSlice9'];

export const CONTROL_IDS: readonly ControlId[] = [...TOGGLE_IDS, ...SLIDER_IDS];
