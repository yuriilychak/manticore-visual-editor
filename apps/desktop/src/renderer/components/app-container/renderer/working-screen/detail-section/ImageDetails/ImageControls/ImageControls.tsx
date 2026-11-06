import { type ComponentType, type FC, useMemo } from 'react';

import { Box } from '@mui/material';

import { CONTROL_IDS, CONTROL_TYPE_BY_ID, SLICE_RANGE_CONTROL_IDS, SLIDER_IDS, TOGGLE_IDS } from './constants';
import SliceRangeControl from './SliceRangeControl';
import SliderControl from './SliderControl';
import ToggleControl from './ToggleControl';
import type { ControlId, ControlProps, ControlType, ControlValueById } from './types';

const CONTROL_BY_TYPE: Record<ControlType, ComponentType<ControlProps>> = {
  sliceRange: SliceRangeControl,
  slider: SliderControl,
  toggle: ToggleControl
};

type ImageControlsProps = {
  canGeneratePolygons: boolean;
  generatePolygons: boolean;
  onChange: ControlProps['onChange'];
  sourceHeight: number;
  sourceWidth: number;
  values: ControlValueById;
};

const ImageControls: FC<ImageControlsProps> = ({ canGeneratePolygons, generatePolygons, onChange, sourceHeight, sourceWidth, values }) => {
  const controlDataById = useMemo<Partial<Record<ControlId, number>>>(() => ({
    sliceHorizontal: sourceWidth,
    sliceVertical: sourceHeight
  }), [sourceHeight, sourceWidth]);
  const hiddenControlIds = new Set<ControlId>(
    [
      ...SLIDER_IDS.filter((id) => !canGeneratePolygons || (!generatePolygons && id !== 'alphaThreshold')),
      ...SLICE_RANGE_CONTROL_IDS.filter(() => generatePolygons || !values.slice9),
      ...(generatePolygons ? ['slice9' as const, 'transparentPadding' as const, 'colorMargin' as const] : [])
    ]
  );
  const disabledControlIds = new Set<ControlId>(
    TOGGLE_IDS.filter((id) => (!canGeneratePolygons && id === 'usePolygonsInsteadOfQuads') || (id === 'transparentPadding' && values.colorMargin) || (id === 'colorMargin' && values.transparentPadding))
  );

  return (
    <Box columnGap={2} display="flex" flexWrap="wrap" px={1} rowGap={1}>
      {CONTROL_IDS.filter((id) => !hiddenControlIds.has(id)).map((id) => {
        const Control = CONTROL_BY_TYPE[CONTROL_TYPE_BY_ID[id]];
        return <Control data={controlDataById[id]} disabled={disabledControlIds.has(id)} id={id} key={id} onChange={onChange} value={values[id]} />;
      })}
    </Box>
  );
};

export default ImageControls;
