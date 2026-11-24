import { packPolygonsInSquare, POLYGON_PACKING_ITERATIONS, type PolygonPackingConfig } from './polygon-packing';
import { ATLAS_PADDING, MAX_POWER_OF_TWO_ATLAS_SIZE, type AtlasLayout, type AtlasPackingInput, type AtlasPlacement, type AtlasPolygonImage, type PolygonPackingOptions } from './types';

const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(Math.max(1, value)));
const quadPolygon = ({ height, width }: AtlasPolygonImage) => new Float32Array([0, 0, width, 0, width, height, 0, height]);
type FlatPolygon = AtlasPackingInput & { localX: number; localY: number };

const POLYGON_ATLAS_PACKING_CONFIG: PolygonPackingConfig = {
  curveTolerance: 0.3,
  mutationRate: 10,
  populationSize: 12,
  rotations: 4,
  // PolygonPack spacing is edge-to-edge. Reserve the padding on both sprites.
  spacing: ATLAS_PADDING * 2,
  useHoles: false
};

const polygonBounds = (points: Float32Array) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, points[index]); minY = Math.min(minY, points[index + 1]);
    maxX = Math.max(maxX, points[index]); maxY = Math.max(maxY, points[index + 1]);
  }
  return { height: maxY - minY, maxX, maxY, minX, minY, width: maxX - minX };
};

const translatePolygon = (points: Float32Array, x: number, y: number) => Float32Array.from(points, (point, index) => point + (index % 2 ? y : x));

/** SVGnest input is local to each shape, never cropped-image coordinates. */
const normalizePolygonOrigin = (points: Float32Array) => {
  let minX = Infinity, minY = Infinity;
  for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, points[index]);
    minY = Math.min(minY, points[index + 1]);
  }
  return { localX: minX, localY: minY, points: translatePolygon(points, -minX, -minY) };
};

const isAxisAlignedQuad = (points: Float32Array) => {
  if (points.length !== 8) return false;
  const { height, width } = polygonBounds(points);
  if (width <= 0 || height <= 0) return false;
  const xs = new Set<number>(), ys = new Set<number>(), corners = new Set<string>();
  for (let index = 0; index < points.length; index += 2) {
    xs.add(points[index]); ys.add(points[index + 1]); corners.add(`${points[index]},${points[index + 1]}`);
  }
  return xs.size === 2 && ys.size === 2 && corners.size === 4;
};

export const isQuadAtlas = (images: readonly AtlasPolygonImage[]) => images.every(({ polygons }) => !polygons?.length || (polygons.length === 1 && isAxisAlignedQuad(polygons[0])));

const flattenPolygons = (images: readonly AtlasPolygonImage[]): FlatPolygon[] => {
  const flattened: FlatPolygon[] = [];
  for (const { height, id: sourceId, polygons, width } of images) {
    if (polygons?.length) {
      polygons.forEach((points, polygonIndex) => {
        const normalized = normalizePolygonOrigin(points);
        flattened.push({ id: flattened.length, ...normalized, polygonIndex, sourceId });
      });
    } else {
      const normalized = normalizePolygonOrigin(quadPolygon({ height, id: sourceId, width }));
      flattened.push({ id: flattened.length, ...normalized, sourceId });
    }
  }
  return flattened;
};

/** Separates source polygons before SVGnest builds its containment tree. */
const arrangePolygonsInRows = (inputs: readonly FlatPolygon[], size: number): FlatPolygon[] => {
  let x = ATLAS_PADDING, y = ATLAS_PADDING, rowHeight = 0;
  return inputs.map((input) => {
    const { height, width } = polygonBounds(input.points);
    if (x + width + ATLAS_PADDING > size) {
      x = ATLAS_PADDING;
      y += rowHeight + ATLAS_PADDING;
      rowHeight = 0;
    }
    const arranged = { ...input, points: translatePolygon(input.points, x, y) };
    x += width + ATLAS_PADDING;
    rowHeight = Math.max(rowHeight, height);
    return arranged;
  });
};

const rotatedPolygonBounds = (points: Float32Array, rotation: number) => {
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  const rotated = Float32Array.from(points, (point, index) => {
    const x = points[index - index % 2], y = points[index - index % 2 + 1];
    return index % 2 ? x * sine + y * cosine : x * cosine - y * sine;
  });
  return polygonBounds(rotated);
};

/** Converts SVGnest's transform coordinates to padded, top-left atlas coordinates. */
const atlasItemsFromPolygonPlacements = (placements: Awaited<ReturnType<typeof packPolygonsInSquare>>, arrangedInputs: readonly FlatPolygon[], inputs: readonly FlatPolygon[], size: number): AtlasPlacement[] | null => {
  if (!placements) return null;
  const arrangedById = new Map(arrangedInputs.map((input) => [input.id, input]));
  const inputById = new Map(inputs.map((input) => [input.id, input]));
  const positioned = placements.map((placement) => {
    const arranged = arrangedById.get(placement.id), input = inputById.get(placement.id);
    if (!arranged || !input) return null;
    return { bounds: rotatedPolygonBounds(arranged.points, placement.rotation), input, placement };
  });
  if (!positioned.every((item): item is NonNullable<typeof item> => item !== null)) return null;
  const minX = Math.min(...positioned.map(({ bounds, placement }) => placement.x + bounds.minX));
  const minY = Math.min(...positioned.map(({ bounds, placement }) => placement.y + bounds.minY));
  const maxX = Math.max(...positioned.map(({ bounds, placement }) => placement.x + bounds.maxX));
  const maxY = Math.max(...positioned.map(({ bounds, placement }) => placement.y + bounds.maxY));
  if (maxX - minX + ATLAS_PADDING * 2 > size || maxY - minY + ATLAS_PADDING * 2 > size) return null;
  return positioned.map(({ bounds, input, placement }) => ({
    id: input.sourceId,
    localX: input.localX,
    localY: input.localY,
    polygonIndex: input.polygonIndex,
    rotated: placement.rotation % 180 !== 0,
    rotation: placement.rotation,
    x: Math.round(placement.x + bounds.minX - minX + ATLAS_PADDING),
    y: Math.round(placement.y + bounds.minY - minY + ATLAS_PADDING),
  }));
};

/** Packs non-rectangular image polygons into the smallest fitting power-of-two square. */
export const packPolygonAtlasImages = async (images: readonly AtlasPolygonImage[], { onInput, onProgress }: PolygonPackingOptions): Promise<AtlasLayout | null> => {
  const inputs = flattenPolygons(images);
  const bounds = inputs.map(({ points }) => polygonBounds(points));
  const totalArea = bounds.reduce((total, { height, width }) => total + (width + ATLAS_PADDING * 2) * (height + ATLAS_PADDING * 2), 0);
  const largestSide = Math.max(...bounds.flatMap(({ height, width }) => [height + ATLAS_PADDING * 2, width + ATLAS_PADDING * 2]));
  const squareRootArea = Math.sqrt(totalArea);
  let size = nextPowerOfTwo(Math.max(Math.ceil(squareRootArea), largestSide));
  while (size <= MAX_POWER_OF_TWO_ATLAS_SIZE) {
    const arrangedInputs = arrangePolygonsInRows(inputs, size);
    onInput?.(arrangedInputs, size);
    try {
      const placements = await packPolygonsInSquare(arrangedInputs, size, POLYGON_ATLAS_PACKING_CONFIG, POLYGON_PACKING_ITERATIONS, onProgress);
      const items = atlasItemsFromPolygonPlacements(placements, arrangedInputs, inputs, size);
      if (items) return { height: size, items, width: size };
    } catch { /* Try the next atlas size. */ }
    size *= 2;
  }
  return null;
};
