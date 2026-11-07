import { type MouseEvent, type PointerEvent, useCallback, useEffect, useReducer, useRef } from 'react';

import { type DialogProps, useTheme } from '@mui/material';

import { DEFAULT_POINTER_STATE } from './constants';
import { createBitmap, getPointIndexAt, serializePoints, toPoint } from './helpers';
import PolygonEditorBuilder from './PolygonEditorBuilder';
import { createInitialPolygonEditorState, polygonEditorReducer } from './reducer';
import type { PointerState } from './types';

export type PolygonEditorDialogProps = {
  allPoints: readonly Uint16Array[];
  image: ArrayBuffer;
  format: string;
  maxPointCount: number;
  onClose: () => void;
  onSubmit: (points: Uint16Array) => Promise<void>;
  open: boolean;
  points: Uint16Array;
};

export const usePolygonEditorDialog = ({ allPoints, format, image, maxPointCount, onClose, onSubmit, open, points: initialPoints }: PolygonEditorDialogProps) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useReducer(polygonEditorReducer, initialPoints, createInitialPolygonEditorState);
  const { bitmap, points, saving } = state;
  const pointCount = points.length;
  const canAddPoints = pointCount < maxPointCount;
  const canRemovePoints = pointCount > 3;
  const canSubmit = pointCount >= 3 && pointCount <= maxPointCount;
  const pointerStateRef = useRef<PointerState>(DEFAULT_POINTER_STATE);

  useEffect(() => {
    if (!open) return;
    const request = { active: true };
    void createBitmap({ format, image, request }).then((bitmap) => {
      if (bitmap) dispatch({ type: 'bitmap-loaded', payload: { bitmap } });
    });
    return () => { request.active = false; };
  }, [format, image, open]);

  useEffect(() => () => bitmap?.close(), [bitmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !bitmap) return;

    new PolygonEditorBuilder({ allPoints, bitmap, canvas, context, points, theme }).draw();
  }, [allPoints, bitmap, points, theme]);

  const getPoint = useCallback((event: { clientX: number; clientY: number }) => toPoint(canvasRef.current, bitmap, event), [bitmap]);
  const handleDoubleClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const result = getPoint(event);
    if (!result) return;
    const { point, scale } = result;
    const index = getPointIndexAt(points, point, scale);
    if (index >= 0 && canRemovePoints) dispatch({ type: 'point-removed', payload: { index } });
    else if (canAddPoints) dispatch({ type: 'point-inserted', payload: { point } });
  }, [canAddPoints, canRemovePoints, getPoint, points]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const result = getPoint(event);
    if (!result) return;
    const { point, scale } = result;
    const index = getPointIndexAt(points, point, scale);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStateRef.current = index >= 0
      ? { ...DEFAULT_POINTER_STATE, dragged: index }
      : { ...DEFAULT_POINTER_STATE, pendingInsertion: point };
  }, [getPoint, points]);
  
  const handlePointerMove = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const index = pointerStateRef.current.dragged;
    const result = getPoint(event);
    if (index < 0 || !result) return;
    dispatch({ type: 'point-moved', payload: { index, point: result.point } });
  }, [getPoint]);
  
  const handlePointerUp = useCallback(() => {
    const { pendingInsertion } = pointerStateRef.current;
    if (pendingInsertion && canAddPoints) dispatch({ type: 'point-inserted', payload: { point: pendingInsertion } });
    pointerStateRef.current = DEFAULT_POINTER_STATE;
  }, [canAddPoints]);
  
  const submit = useCallback(async () => {
    if (!canSubmit) return;
    dispatch({ type: 'saving-changed', payload: { saving: true } });
    try { await onSubmit(serializePoints(points)); } finally { dispatch({ type: 'saving-changed', payload: { saving: false } }); }
  }, [canSubmit, onSubmit, points]);
  const handleClose = useCallback<NonNullable<DialogProps['onClose']>>(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  return {
    canSubmit,
    canvasRef,
    handleClose,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    saving,
    submit
  };
};
