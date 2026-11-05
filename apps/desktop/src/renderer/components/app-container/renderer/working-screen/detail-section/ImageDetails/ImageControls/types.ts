export type SliderControlId = 'alphaThreshold' | 'pointCount' | 'minimalDistance' | 'sliceLeft' | 'sliceRight' | 'sliceTop' | 'sliceBottom';

export type ToggleControlId = 'showTriangles' | 'showPolygon' | 'showSlice9' | 'slice9' | 'usePolygonsInsteadOfQuads';

export type ControlId = SliderControlId | ToggleControlId;

export type ControlValueById = {
  alphaThreshold: number;
  pointCount: number;
  minimalDistance: number;
  sliceBottom: number;
  sliceLeft: number;
  sliceRight: number;
  sliceTop: number;
  showTriangles: boolean;
  showPolygon: boolean;
  showSlice9: boolean;
  slice9: boolean;
  usePolygonsInsteadOfQuads: boolean;
};

export type ControlValue = ControlValueById[ControlId];

export type ControlProps = {
  disabled?: boolean;
  id: ControlId;
  max?: number;
  onChange: (id: ControlId, value: ControlValue) => void;
  value: ControlValue;
};
