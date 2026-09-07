export type ResizeDirection = 'left' | 'right' | 'top';

export type DragState = {
  direction: ResizeDirection;
  startPosition: number;
  startPercentage: number;
};

export type PanePercentages = {
  left: number;
  right: number;
  top: number;
};

export type SeparatorProps = {
  ariaLabel: string;
  direction: ResizeDirection;
  onResizeStart: (dragState: DragState) => void;
  panePercentages: PanePercentages;
};
