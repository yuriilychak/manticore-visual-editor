import type { Point } from './PolygonEditorBuilder';

export type PointerState = {
  dragged: number;
  pendingInsertion: Point | null;
};
