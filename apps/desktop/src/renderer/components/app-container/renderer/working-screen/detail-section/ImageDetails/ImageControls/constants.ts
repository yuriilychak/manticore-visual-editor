import type { ControlId, SliderControlId, ToggleControlId } from './types';

export const SLIDER_CONFIG_BY_ID: Record<SliderControlId, { max: number; min: number }> = {
  alphaThreshold: { max: 254, min: 0 },
  pointCount: { max: 32, min: 5 },
  minimalDistance: { max: 255, min: 1 }
};

export const SLIDER_IDS: readonly SliderControlId[] = ['alphaThreshold', 'pointCount', 'minimalDistance'];

export const TOGGLE_IDS: readonly ToggleControlId[] = ['showTriangles', 'showPolygon', 'usePolygonsInsteadOfQuads'];

export const CONTROL_IDS: readonly ControlId[] = [...TOGGLE_IDS, ...SLIDER_IDS];
