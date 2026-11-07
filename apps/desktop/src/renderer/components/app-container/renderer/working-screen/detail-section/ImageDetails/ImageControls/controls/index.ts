import type { ComponentType } from 'react';

import type { ControlData, ControlProps, ControlType } from '../types';

import SliceRangeControl from './SliceRangeControl';
import SliderControl from './SliderControl';
import ToggleControl from './ToggleControl';

export const CONTROL_BY_TYPE: Record<ControlType, ComponentType<ControlProps<ControlData>>> = {
  sliceRange: SliceRangeControl,
  slider: SliderControl,
  toggle: ToggleControl
};
