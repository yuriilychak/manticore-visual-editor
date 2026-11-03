import { SLIDER_IDS } from './constants';
import type { ControlId, SliderControlId } from './types';

export const isSliderControlId = (id: ControlId): id is SliderControlId => SLIDER_IDS.includes(id as SliderControlId);
