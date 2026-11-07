import { insertPointAtNearestEdge } from './helpers';
import type { Point } from './PolygonEditorBuilder';

type PolygonEditorState = {
  bitmap: ImageBitmap | null;
  points: Point[];
  saving: boolean;
};

type PolygonEditorAction =
  | { type: 'bitmap-loaded'; payload: { bitmap: ImageBitmap } }
  | { type: 'point-inserted'; payload: { point: Point } }
  | { type: 'point-moved'; payload: { index: number; point: Point } }
  | { type: 'point-removed'; payload: { index: number } }
  | { type: 'saving-changed'; payload: { saving: boolean } };

export const createInitialPolygonEditorState = (initialPoints: Uint16Array): PolygonEditorState => ({
  bitmap: null,
  points: Array.from({ length: initialPoints.length / 2 }, (_, index) => ({ x: initialPoints[index * 2], y: initialPoints[index * 2 + 1] })),
  saving: false
});

export const polygonEditorReducer = (state: PolygonEditorState, action: PolygonEditorAction): PolygonEditorState => {
  switch (action.type) {
    case 'bitmap-loaded':
      return { ...state, bitmap: action.payload.bitmap };
    case 'point-inserted':
      return { ...state, points: insertPointAtNearestEdge(state.points, action.payload.point) };
    case 'point-moved':
      return { ...state, points: state.points.map((point, index) => index === action.payload.index ? action.payload.point : point) };
    case 'point-removed':
      return { ...state, points: state.points.filter((_, index) => index !== action.payload.index) };
    case 'saving-changed':
      return { ...state, saving: action.payload.saving };
  }
};
