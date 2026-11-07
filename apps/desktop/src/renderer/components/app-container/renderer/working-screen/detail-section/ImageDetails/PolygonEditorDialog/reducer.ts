import { insertPointAtNearestEdge } from './helpers';
import type { Point } from './PolygonEditorBuilder';

type PolygonEditorState = {
  bitmap: ImageBitmap | null;
  points: Point[];
  saving: boolean;
  selectedPolygonIndex: number;
};

type PolygonEditorAction =
  | { type: 'bitmap-loaded'; payload: { bitmap: ImageBitmap } }
  | { type: 'point-inserted'; payload: { point: Point } }
  | { type: 'point-moved'; payload: { index: number; point: Point } }
  | { type: 'point-removed'; payload: { index: number } }
  | { type: 'polygon-selected'; payload: { index: number; points: Int16Array } }
  | { type: 'saving-changed'; payload: { saving: boolean } };

const createPoints = (points: Int16Array) => Array.from({ length: points.length / 2 }, (_, index) => ({ x: points[index * 2], y: points[index * 2 + 1] }));

export const createInitialPolygonEditorState = (initialPoints: Int16Array): PolygonEditorState => ({
  bitmap: null,
  points: createPoints(initialPoints),
  saving: false,
  selectedPolygonIndex: 0
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
    case 'polygon-selected':
      return { ...state, points: createPoints(action.payload.points), selectedPolygonIndex: action.payload.index };
    case 'saving-changed':
      return { ...state, saving: action.payload.saving };
  }
};
