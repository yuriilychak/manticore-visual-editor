import { type FC, useEffect, useRef, useState } from 'react';

import { Box } from '@mui/material';

import { DIVIDER_SIZE, MIN_PANE_SIZE, PANE_PERCENTAGES_STORAGE_KEY } from './constants';
import { getResizedPanePercentages, getStoredPanePercentages } from './helpers';
import { ProjectSection } from './project-section';
import Separator from './Separator';
import type { DragState } from './types';

type WorkingScreenProps = {
  onRenameProject?: (name: string) => Promise<void>;
  projectName: string;
};

const WorkingScreen: FC<WorkingScreenProps> = ({ onRenameProject, projectName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panePercentages, setPanePercentages] = useState(getStoredPanePercentages);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const { left, right, top } = panePercentages;

  useEffect(() => {
    if (!dragState) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      setPanePercentages((currentPercentages) =>
        getResizedPanePercentages(currentPercentages, dragState, event, bounds)
      );
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PANE_PERCENTAGES_STORAGE_KEY, JSON.stringify(panePercentages));
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }, [panePercentages]);

  return (
    <Box
      component="main"
      display="grid"
      flexGrow={1}
      gridTemplateColumns={`minmax(${MIN_PANE_SIZE}px, calc((100% - ${DIVIDER_SIZE * 2}px) * ${left / 100})) ${DIVIDER_SIZE}px minmax(${MIN_PANE_SIZE}px, calc((100% - ${DIVIDER_SIZE * 2}px) * ${(100 - left - right) / 100})) ${DIVIDER_SIZE}px minmax(${MIN_PANE_SIZE}px, calc((100% - ${DIVIDER_SIZE * 2}px) * ${right / 100}))`}
      minHeight={0}
      overflow="hidden"
      ref={containerRef}
    >
      <Box aria-label="Left panel" component="section" minWidth={MIN_PANE_SIZE}>
        <ProjectSection name={projectName} onRename={onRenameProject} />
      </Box>
      <Separator
        ariaLabel="Resize left panel"
        direction="left"
        onResizeStart={setDragState}
        panePercentages={panePercentages}
      />
      <Box
        display="grid"
        gridTemplateRows={`minmax(${MIN_PANE_SIZE}px, calc((100% - ${DIVIDER_SIZE}px) * ${top / 100})) ${DIVIDER_SIZE}px minmax(${MIN_PANE_SIZE}px, calc((100% - ${DIVIDER_SIZE}px) * ${(100 - top) / 100}))`}
        minHeight={MIN_PANE_SIZE * 2 + DIVIDER_SIZE}
        minWidth={MIN_PANE_SIZE}
        overflow="hidden"
      >
        <Box aria-label="Top editor section" component="section" minHeight={MIN_PANE_SIZE} />
        <Separator
          ariaLabel="Resize editor sections"
          direction="top"
          onResizeStart={setDragState}
          panePercentages={panePercentages}
        />
        <Box aria-label="Bottom editor section" component="section" minHeight={MIN_PANE_SIZE} />
      </Box>
      <Separator
        ariaLabel="Resize right panel"
        direction="right"
        onResizeStart={setDragState}
        panePercentages={panePercentages}
      />
      <Box aria-label="Right panel" component="section" minWidth={MIN_PANE_SIZE} />
    </Box>
  );
};

export default WorkingScreen;
