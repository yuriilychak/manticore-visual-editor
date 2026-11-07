export type SliderControlId = 'alphaThreshold' | 'pointCount' | 'minimalDistance';

export type SliceControlId = 'sliceHorizontal' | 'sliceVertical';

export type ToggleControlId = 'colorMargin' | 'slice9' | 'transparentPadding' | 'usePolygonsInsteadOfQuads';

export type ControlType = 'sliceRange' | 'slider' | 'toggle';

export type ControlId = SliderControlId | SliceControlId | ToggleControlId;

export type ControlValueById = {
  alphaThreshold: number;
  colorMargin: boolean;
  pointCount: number;
  minimalDistance: number;
  sliceHorizontal: [number, number];
  sliceVertical: [number, number];
  transparentPadding: boolean;
  slice9: boolean;
  usePolygonsInsteadOfQuads: boolean;
};

export type ControlValue = ControlValueById[ControlId];

export type ControlData = {
  max: number;
};

export type ControlProps<Data = unknown> = {
  data: Data;
  disabled?: boolean;
  id: ControlId;
  onChange: (id: ControlId, value: ControlValue) => void;
  value: ControlValue;
};
