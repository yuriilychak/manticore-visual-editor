export type SliderControlId = 'alphaThreshold' | 'pointCount' | 'minimalDistance';

export type ToggleControlId = 'showTriangles' | 'showPolygon' | 'usePolygonsInsteadOfQuads';

export type ControlId = SliderControlId | ToggleControlId;

export type ControlValueById = {
  alphaThreshold: number;
  pointCount: number;
  minimalDistance: number;
  showTriangles: boolean;
  showPolygon: boolean;
  usePolygonsInsteadOfQuads: boolean;
};

export type ControlValue = ControlValueById[ControlId];

export type ControlProps = {
  disabled?: boolean;
  id: ControlId;
  onChange: (id: ControlId, value: ControlValue) => void;
  value: ControlValue;
};
