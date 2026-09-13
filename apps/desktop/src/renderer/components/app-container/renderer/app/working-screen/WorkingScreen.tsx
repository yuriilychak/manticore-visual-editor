import { type FC } from 'react';

import { Box } from '@mui/material';

import type { ProjectActionHandler } from '../../../../../../types';

import { DIVIDER_SIZE, MIN_PANE_SIZE } from './constants';
import { ProjectSection } from './project-section';
import Separator from './Separator';
import { useSectionResize } from './useSectionResize';

type WorkingScreenProps = {
  onAction: ProjectActionHandler;
  projectName: string;
};

const WorkingScreen: FC<WorkingScreenProps> = ({ onAction, projectName }) => {
  const { containerRef, gridTemplateColumns, gridTemplateRows, panePercentages, startResize } = useSectionResize();

  return (
    <Box
      component="main"
      display="grid"
      flexGrow={1}
      gridTemplateColumns={gridTemplateColumns}
      minHeight={0}
      overflow="hidden"
      ref={containerRef}
    >
      <Box aria-label="Left panel" component="section" minWidth={MIN_PANE_SIZE}>
        <ProjectSection name={projectName} onAction={onAction} />
      </Box>
      <Separator
        ariaLabel="Resize left panel"
        direction="left"
        onResizeStart={startResize}
        panePercentages={panePercentages}
      />
      <Box
        display="grid"
        gridTemplateRows={gridTemplateRows}
        minHeight={MIN_PANE_SIZE * 2 + DIVIDER_SIZE}
        minWidth={MIN_PANE_SIZE}
        overflow="hidden"
      >
        <Box aria-label="Top editor section" component="section" minHeight={MIN_PANE_SIZE} />
        <Separator
          ariaLabel="Resize editor sections"
          direction="top"
          onResizeStart={startResize}
          panePercentages={panePercentages}
        />
        <Box aria-label="Bottom editor section" component="section" minHeight={MIN_PANE_SIZE} />
      </Box>
      <Separator
        ariaLabel="Resize right panel"
        direction="right"
        onResizeStart={startResize}
        panePercentages={panePercentages}
      />
      <Box aria-label="Right panel" component="section" minWidth={MIN_PANE_SIZE} />
    </Box>
  );
};

export default WorkingScreen;
