import { type FC, useMemo } from 'react';

import { Box } from '@mui/material';

import { CONTROL_IDS, CONTROL_TYPE_BY_ID, DEFAULT_CONTROL_DATA, POLYGON_GENERATION_HIDDEN_CONTROL_IDS, SLICE_RANGE_CONTROL_IDS, SLIDER_IDS } from './constants';
import { CONTROL_BY_TYPE } from './controls';
import type { ControlData, ControlId, ControlProps, ControlValueById } from './types';

type ImageControlsProps = {
  canGeneratePolygons: boolean;
  generatePolygons: boolean;
  onChange: ControlProps['onChange'];
  sourceHeight: number;
  sourceWidth: number;
  values: ControlValueById;
};

const ImageControls: FC<ImageControlsProps> = ({ canGeneratePolygons, generatePolygons, onChange, sourceHeight, sourceWidth, values }) => {
  const controlDataById = useMemo<Partial<Record<ControlId, ControlData>>>(() => ({
    sliceHorizontal: { max: sourceWidth },
    sliceVertical: { max: sourceHeight }
  }), [sourceHeight, sourceWidth]);
  const hiddenControlIds = new Set<ControlId>(
    [
      ...SLIDER_IDS.filter((id) => !canGeneratePolygons || (!generatePolygons && id !== 'alphaThreshold')),
      ...(generatePolygons || !values.slice9 ? SLICE_RANGE_CONTROL_IDS : []),
      ...(generatePolygons ? POLYGON_GENERATION_HIDDEN_CONTROL_IDS : [])
    ]
  );
  const disabledControlById: Partial<Record<ControlId, boolean>> = {
    colorMargin: values.transparentPadding,
    transparentPadding: values.colorMargin,
    usePolygonsInsteadOfQuads: !canGeneratePolygons
  };

  return (
    <Box columnGap={2} display="flex" flexWrap="wrap" px={1} rowGap={1}>
      {CONTROL_IDS.filter((id) => !hiddenControlIds.has(id)).map((id) => {
        const Control = CONTROL_BY_TYPE[CONTROL_TYPE_BY_ID[id]];
        return <Control data={controlDataById[id] ?? DEFAULT_CONTROL_DATA} disabled={disabledControlById[id]} id={id} key={id} onChange={onChange} value={values[id]} />;
      })}
    </Box>
  );
};

export default ImageControls;
