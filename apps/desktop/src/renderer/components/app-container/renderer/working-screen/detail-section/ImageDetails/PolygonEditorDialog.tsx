import { type FC, useEffect, useRef, useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, useTheme } from '@mui/material';

type Point = { x: number; y: number };

type PolygonEditorDialogProps = {
  allPoints: readonly Uint16Array[];
  image: ArrayBuffer;
  format: string;
  maxPointCount: number;
  onClose: () => void;
  onSubmit: (points: Uint16Array) => Promise<void>;
  open: boolean;
  points: Uint16Array;
};

const PolygonEditorDialog: FC<PolygonEditorDialogProps> = ({ allPoints, format, image, maxPointCount, onClose, onSubmit, open, points: initialPoints }) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>(() => Array.from({ length: initialPoints.length / 2 }, (_, index) => ({ x: initialPoints[index * 2], y: initialPoints[index * 2 + 1] })));
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const draggedRef = useRef<number | null>(null);
  const pendingInsertionRef = useRef<Point | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void createImageBitmap(new Blob([image], { type: `image/${format}` })).then((value) => {
      if (active) setBitmap(value); else value.close();
    });
    return () => { active = false; };
  }, [format, image, open]);
  useEffect(() => () => bitmap?.close(), [bitmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !bitmap) return;
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const x = (canvas.width - bitmap.width * scale) / 2;
    const y = (canvas.height - bitmap.height * scale) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.palette.background.default;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.palette.background.paper;
    for (let row = 0; row < canvas.height; row += 16) {
      for (let column = (row / 16 % 2) * 16; column < canvas.width; column += 32) context.fillRect(column, row, 16, 16);
    }
    context.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
    allPoints.forEach((polygon) => {
      if (!polygon.length) return;
      context.beginPath(); context.moveTo(x + polygon[0] * scale, y + polygon[1] * scale);
      for (let index = 2; index < polygon.length; index += 2) context.lineTo(x + polygon[index] * scale, y + polygon[index + 1] * scale);
      context.closePath(); context.strokeStyle = '#90a4ae'; context.lineWidth = 1; context.stroke();
    });
    if (points.length) {
      context.beginPath(); context.moveTo(x + points[0].x * scale, y + points[0].y * scale);
      points.slice(1).forEach((point) => context.lineTo(x + point.x * scale, y + point.y * scale)); context.closePath();
      context.strokeStyle = '#0288d1'; context.lineWidth = 2; context.stroke();
      points.forEach((point) => { context.fillStyle = '#0288d1'; context.fillRect(x + point.x * scale - 4, y + point.y * scale - 4, 8, 8); });
    }
  }, [allPoints, bitmap, points, theme.palette.background.default, theme.palette.background.paper]);

  const toPoint = (event: { clientX: number; clientY: number }): { point: Point; scale: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
    const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
    return { point: { x: Math.max(0, Math.min(bitmap.width, (canvasX - (canvas.width - bitmap.width * scale) / 2) / scale)), y: Math.max(0, Math.min(bitmap.height, (canvasY - (canvas.height - bitmap.height * scale) / 2) / scale)) }, scale };
  };
  const pointIndexAt = (point: Point, scale: number) => points.findIndex((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 10 / scale);
  const nearestEdgeIndex = (point: Point) => {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let index = 0; index < points.length; ++index) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
      const distance = Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
      if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
    }
    return nearestIndex;
  };
  const submit = async () => {
    if (points.length < 3) return;
    setSaving(true);
    try { await onSubmit(new Uint16Array(points.flatMap(({ x, y }) => [Math.round(x), Math.round(y)]))); } finally { setSaving(false); }
  };

  return <Dialog fullWidth maxWidth="md" onClose={saving ? undefined : onClose} open={open}>
    <DialogTitle>Modify polygon</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}><Typography mb={1} variant="body2">Drag a square to move it. Double-click a square to remove it. Click elsewhere to add a point to the nearest edge.</Typography><canvas height={480} onDoubleClick={(event) => { const result = toPoint(event); if (!result) return; const index = pointIndexAt(result.point, result.scale); if (index >= 0 && points.length > 3) setPoints((value) => value.filter((_, pointIndex) => pointIndex !== index)); else if (points.length < maxPointCount) setPoints((value) => { const edgeIndex = nearestEdgeIndex(result.point); return [...value.slice(0, edgeIndex + 1), result.point, ...value.slice(edgeIndex + 1)]; }); }} onPointerDown={(event) => { const result = toPoint(event); if (!result) return; const index = pointIndexAt(result.point, result.scale); event.currentTarget.setPointerCapture(event.pointerId); draggedRef.current = index >= 0 ? index : null; pendingInsertionRef.current = index >= 0 ? null : result.point; }} onPointerMove={(event) => { const index = draggedRef.current; const result = toPoint(event); if (index === null || !result) return; setPoints((value) => value.map((candidate, pointIndex) => pointIndex === index ? result.point : candidate)); }} onPointerUp={() => { const insertion = pendingInsertionRef.current; if (insertion && points.length < maxPointCount) setPoints((value) => { const index = nearestEdgeIndex(insertion); return [...value.slice(0, index + 1), insertion, ...value.slice(index + 1)]; }); draggedRef.current = null; pendingInsertionRef.current = null; }} ref={canvasRef} style={{ background: '#222', maxWidth: '100%', touchAction: 'none', width: '100%' }} width={720} /></DialogContent>
    <DialogActions sx={{ pb: 3, px: 3 }}><Button disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving || points.length < 3} onClick={() => void submit()} variant="contained">Apply</Button></DialogActions>
  </Dialog>;
};

export default PolygonEditorDialog;
