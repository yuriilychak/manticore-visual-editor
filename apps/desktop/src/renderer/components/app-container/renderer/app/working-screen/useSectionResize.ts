import { useEffect, useMemo, useRef, useState } from 'react';

import { PANE_PERCENTAGES_STORAGE_KEY } from './constants';
import {
  getGridTemplateColumns,
  getGridTemplateRows,
  getResizedPanePercentages,
  getStoredPanePercentages
} from './helpers';
import type { DragState } from './types';

export const useSectionResize = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panePercentages, setPanePercentages] = useState(getStoredPanePercentages);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const { left, right, top } = panePercentages;
  const gridTemplateColumns = useMemo(() => getGridTemplateColumns(left, right), [left, right]);
  const gridTemplateRows = useMemo(() => getGridTemplateRows(top), [top]);

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

  return { containerRef, gridTemplateColumns, gridTemplateRows, panePercentages, startResize: setDragState };
};
