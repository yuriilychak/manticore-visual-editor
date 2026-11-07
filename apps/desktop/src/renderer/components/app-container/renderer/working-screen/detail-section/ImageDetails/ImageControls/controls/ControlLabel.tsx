import { type FC, type ReactNode } from 'react';

import { Box } from '@mui/material';

import { CENTERED_CONTROL_LABEL_PROPS, DEFAULT_CONTROL_LABEL_PROPS } from './constants';
import ControlLabelItem from './ControlLabelItem';

type ControlLabelProps = {
  centered?: boolean;
  children: ReactNode;
  htmlFor?: string;
  id: string | readonly string[];
};

const ControlLabel: FC<ControlLabelProps> = ({ centered = false, children, htmlFor, id }) => {
  const ids = Array.isArray(id) ? id : [id];

  return <Box {...(centered ? CENTERED_CONTROL_LABEL_PROPS : DEFAULT_CONTROL_LABEL_PROPS)}>
    <Box alignItems="center" display="flex" justifyContent={ids.length > 1 ? 'space-between' : undefined} width="100%">
      {ids.map((controlId) => <ControlLabelItem htmlFor={htmlFor} id={controlId} key={controlId} />)}
    </Box>
    {children}
  </Box>;
};

export default ControlLabel;
