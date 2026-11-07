import type { Point } from './PolygonEditorBuilder';

type CreateBitmapConfig = {
  format: string;
  image: ArrayBuffer;
  request: { active: boolean };
};

export const createBitmap = async ({ format, image, request }: CreateBitmapConfig): Promise<ImageBitmap | null> => {
  try {
    const bitmap = await createImageBitmap(new Blob([image], { type: `image/${format}` }));
    if (request.active) return bitmap;
    bitmap.close();
    return null;
  } catch {
    return null;
  }
};

export const toPoint = (canvas: HTMLCanvasElement | null, bitmap: ImageBitmap | null, event: { clientX: number; clientY: number }): { point: Point; scale: number } | null => {
  if (!canvas || !bitmap) return null;

  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
  const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
  const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
  return {
    point: {
      x: (canvasX - (canvas.width - bitmap.width * scale) / 2) / scale,
      y: (canvasY - (canvas.height - bitmap.height * scale) / 2) / scale
    },
    scale
  };
};

export const getPointIndexAt = (points: readonly Point[], point: Point, scale: number) => points.findIndex((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 10 / scale);

export const getNearestEdgeIndex = (points: readonly Point[], point: Point) => {
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

export const insertPointAtNearestEdge = (points: readonly Point[], point: Point) => {
  const index = getNearestEdgeIndex(points, point);
  const updatedPoints = [...points];
  updatedPoints.splice(index + 1, 0, point);
  return updatedPoints;
};

export const serializePoints = (points: readonly Point[]) => new Int16Array(points.flatMap(({ x, y }) => [Math.round(x), Math.round(y)]));
