import { type FC, type PointerEvent as ReactPointerEvent } from 'react';

import { Box } from '@mui/material';

import { STYLES } from './constants';
import type { SeparatorProps } from './types';

const Separator: FC<SeparatorProps> = ({ ariaLabel, direction, onResizeStart, panePercentages }) => {
  const orientation = direction === 'top' ? 'horizontal' : 'vertical';
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    onResizeStart({
      direction,
      startPosition: direction === 'top' ? event.clientY : event.clientX,
      startPercentage: panePercentages[direction]
    });
  };
  const styles = orientation === 'vertical' ? STYLES.verticalDivider : STYLES.horizontalDivider;

  return (
    <Box
      aria-label={ariaLabel}
      aria-orientation={orientation}
      onPointerDown={handlePointerDown}
      role="separator"
      sx={styles}
    />
  );
};

export default Separator;
