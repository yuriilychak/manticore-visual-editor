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
  values: ControlValueById;
};

const ImageControls: FC<ImageControlsProps> = ({ canGeneratePolygons, generatePolygons, onChange, values }) => {
  const hiddenControlIds = new Set<ControlId>(
    SLIDER_IDS.filter((id) => !canGeneratePolygons || (!generatePolygons && id !== 'alphaThreshold'))
  );
  const disabledControlIds = new Set<ControlId>(
    TOGGLE_IDS.filter((id) => !canGeneratePolygons && id === 'usePolygonsInsteadOfQuads')
  );

  return (
    <Box columnGap={2} display="flex" flexWrap="wrap" px={1} rowGap={1}>
      {CONTROL_IDS.filter((id) => !hiddenControlIds.has(id)).map((id) => {
        const Control = isSliderControlId(id) ? SliderControl : ToggleControl;
        return <Control disabled={disabledControlIds.has(id)} id={id} key={id} onChange={onChange} value={values[id]} />;
      })}
    </Box>
  );
};

export default ImageControls;
