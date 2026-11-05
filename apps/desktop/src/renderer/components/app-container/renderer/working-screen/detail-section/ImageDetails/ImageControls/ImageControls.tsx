import { type FC } from 'react';

import { Box } from '@mui/material';

import { CONTROL_IDS, SLIDER_IDS, TOGGLE_IDS } from './constants';
import { isSliderControlId } from './helpers';
import SliderControl from './SliderControl';
import ToggleControl from './ToggleControl';
import type { ControlId, ControlProps, ControlValueById } from './types';

type ImageControlsProps = {
  canGeneratePolygons: boolean;
  generatePolygons: boolean;
  onChange: ControlProps['onChange'];
  sourceHeight: number;
  sourceWidth: number;
  values: ControlValueById;
};

const ImageControls: FC<ImageControlsProps> = ({ canGeneratePolygons, generatePolygons, onChange, sourceHeight, sourceWidth, values }) => {
  const hiddenControlIds = new Set<ControlId>(
    [...SLIDER_IDS.filter((id) => id.startsWith('slice') ? !values.slice9 : !canGeneratePolygons || (!generatePolygons && id !== 'alphaThreshold')), ...(generatePolygons ? ['slice9' as const, 'showSlice9' as const] : !values.slice9 ? ['showSlice9' as const] : [])]
  );
  const disabledControlIds = new Set<ControlId>(
    TOGGLE_IDS.filter((id) => !canGeneratePolygons && id === 'usePolygonsInsteadOfQuads')
  );

  return (
    <Box columnGap={2} display="flex" flexWrap="wrap" px={1} rowGap={1}>
      {CONTROL_IDS.filter((id) => !hiddenControlIds.has(id)).map((id) => {
        const Control = isSliderControlId(id) ? SliderControl : ToggleControl;
        const max = id === 'sliceLeft' ? sourceWidth - values.sliceRight : id === 'sliceRight' ? sourceWidth - values.sliceLeft : id === 'sliceTop' ? sourceHeight - values.sliceBottom : id === 'sliceBottom' ? sourceHeight - values.sliceTop : undefined;
        return <Control disabled={disabledControlIds.has(id)} id={id} key={id} max={max} onChange={onChange} value={values[id]} />;
      })}
    </Box>
  );
};

export default ImageControls;
