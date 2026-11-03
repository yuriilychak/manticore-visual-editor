import { DEFAULT_IMAGE_POLYGON_SETTINGS, type ProjectImagePolygonSettings } from './image-polygon-settings';

export type ProjectImageMetadata = {
  alphaPolygons: number[][];
  binarySize: number;
  croppedHeight: number;
  croppedWidth: number;
  croppedX: number;
  croppedY: number;
  format: string;
  hasTransparency: boolean;
  polygonSettings: ProjectImagePolygonSettings;
  sourceHeight: number;
  sourceWidth: number;
  supportsTransparency: boolean;
};

const TRANSPARENCY_FORMATS = new Set(['avif', 'gif', 'png', 'svg+xml', 'webp']);

type Point = readonly [number, number];

/**
 * Produces the outlines of pixels with non-zero alpha. Coordinates sit on pixel
 * boundaries, so they can be drawn directly over the source image.
 */
function readAlphaPolygons(pixels: Uint8Array, width: number, height: number, alphaThreshold: number): number[][] {
  const edges = new Map<string, Point[]>();
  const key = ([x, y]: Point) => `${x},${y}`;
  const isVisible = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height && pixels[(y * width + x) * 4 + 3] > alphaThreshold;
  const addEdge = (from: Point, to: Point) => {
    const fromKey = key(from);
    const next = edges.get(fromKey) ?? [];
    next.push(to);
    edges.set(fromKey, next);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isVisible(x, y)) continue;
      if (!isVisible(x, y - 1)) addEdge([x, y], [x + 1, y]);
      if (!isVisible(x + 1, y)) addEdge([x + 1, y], [x + 1, y + 1]);
      if (!isVisible(x, y + 1)) addEdge([x + 1, y + 1], [x, y + 1]);
      if (!isVisible(x - 1, y)) addEdge([x, y + 1], [x, y]);
    }
  }

  const polygons: number[][] = [];
  while (edges.size) {
    const [startKey, firstEdges] = edges.entries().next().value as [string, Point[]];
    const first = firstEdges.pop()!;
    if (!firstEdges.length) edges.delete(startKey);
    const [startX, startY] = startKey.split(',').map(Number);
    const polygon = [startX, startY];
    let current = first;

    while (key(current) !== startKey) {
      polygon.push(current[0], current[1]);
      const currentKey = key(current);
      const nextEdges = edges.get(currentKey);
      if (!nextEdges?.length) break;
      current = nextEdges.pop()!;
      if (!nextEdges.length) edges.delete(currentKey);
    }
    if (polygon.length >= 6 && key(current) === startKey) polygons.push(polygon);
  }
  return polygons;
}

/** Reads the header and RGBA payload written by ImageConfigSerialization.serialize. */
export function readProjectImageMetadata(data: Uint8Array, polygonSettings = DEFAULT_IMAGE_POLYGON_SETTINGS): ProjectImageMetadata {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  const ensure = (length: number) => {
    if (!Number.isSafeInteger(length) || length < 0 || offset + length > data.byteLength) throw new Error('Image asset is invalid.');
  };
  const readString = () => {
    ensure(2);
    const length = view.getUint16(offset, true);
    offset += 2;
    ensure(length);
    const value = new TextDecoder().decode(data.subarray(offset, offset + length));
    offset += length;
    return value;
  };

  readString(); // Image UUID
  readString(); // Label
  const format = readString();
  ensure(25); // Flags and three Float64 configuration values
  offset += 25;
  ensure(4);
  const polygonCount = view.getUint32(offset, true);
  offset += 4;
  ensure(polygonCount * 2 + 8);
  offset += polygonCount * 2;
  const sourceWidth = view.getUint32(offset, true);
  const sourceHeight = view.getUint32(offset + 4, true);
  offset += 8;
  ensure(sourceWidth * sourceHeight * 4);

  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;
  let hasTransparency = false;
  for (let y = 0; y < sourceHeight; y++) {
    for (let x = 0; x < sourceWidth; x++) {
      const alpha = data[offset + (y * sourceWidth + x) * 4 + 3];
      if (alpha < 255) hasTransparency = true;
      if (alpha <= polygonSettings.alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    alphaPolygons: hasTransparency ? readAlphaPolygons(data.subarray(offset), sourceWidth, sourceHeight, polygonSettings.alphaThreshold) : [],
    binarySize: data.byteLength,
    croppedHeight: maxY < 0 ? sourceHeight : maxY - minY + 1,
    croppedWidth: maxX < 0 ? sourceWidth : maxX - minX + 1,
    croppedX: maxX < 0 ? 0 : minX,
    croppedY: maxY < 0 ? 0 : minY,
    format,
    hasTransparency,
    polygonSettings,
    sourceHeight,
    sourceWidth,
    supportsTransparency: TRANSPARENCY_FORMATS.has(format)
  };
}
