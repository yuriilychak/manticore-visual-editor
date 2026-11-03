export type ProjectImagePolygon = { points: Uint16Array; triangles: Uint16Array };

export type ProjectImagePolygonSettings = {
  alphaThreshold: number;
  maxPointCount: number;
  minimalDistance: number;
  offset: number;
  polygons: ProjectImagePolygon[];
  polygonsApplied: boolean;
};

export type ProjectImagePolygonSettingsInput = Omit<ProjectImagePolygonSettings, 'offset' | 'polygons'> & Partial<Pick<ProjectImagePolygonSettings, 'offset' | 'polygons'>>;

type SerializedProjectImagePolygonSettings = Omit<ProjectImagePolygonSettings, 'polygons'> & {
  polygons: { points: number[]; triangles: number[] }[];
};

export const DEFAULT_IMAGE_POLYGON_SETTINGS: ProjectImagePolygonSettings = {
  alphaThreshold: 0, maxPointCount: 32, minimalDistance: 8, offset: 0, polygons: [], polygonsApplied: false
};

export function packTriangleIndices(first: number, second: number, third: number): number {
  if (![first, second, third].every((index) => Number.isInteger(index) && index >= 0 && index < 32)) throw new Error('Triangle index is invalid.');
  return (first << 10) | (second << 5) | third;
}

export function createQuadPolygonSettings(settings: ProjectImagePolygonSettingsInput, x: number, y: number, width: number, height: number): ProjectImagePolygonSettings {
  return { ...settings, offset: settings.offset ?? 0, polygons: [{ points: new Uint16Array([x, y, x + width, y, x + width, y + height, x, y + height]), triangles: new Uint16Array([packTriangleIndices(0, 1, 2), packTriangleIndices(0, 2, 3)]) }] };
}

const validatePolygon = ({ points, triangles }: ProjectImagePolygon) => {
  const pointCount = points.length / 2;
  if (!Number.isInteger(pointCount) || pointCount < 1 || pointCount > 32 || points.length !== pointCount * 2) throw new Error('Polygon point count is invalid.');
  if (Array.from(triangles).some((triangle) => triangle > 0x7fff)) throw new Error('Triangle data is invalid.');
};

const validateSettings = (settings: ProjectImagePolygonSettings) => {
  if (!Number.isInteger(settings.alphaThreshold) || settings.alphaThreshold < 0 || settings.alphaThreshold > 254) throw new Error('Alpha threshold is invalid.');
  if (!Number.isInteger(settings.maxPointCount) || settings.maxPointCount < 5 || settings.maxPointCount > 32) throw new Error('Max point count is invalid.');
  if (!Number.isInteger(settings.minimalDistance) || settings.minimalDistance < 1 || settings.minimalDistance > 256) throw new Error('Minimal distance is invalid.');
  if (!Number.isInteger(settings.offset) || settings.offset < 0 || settings.offset > 255) throw new Error('Polygon offset is invalid.');
  if (!settings.polygons.length) throw new Error('Polygon count is invalid.');
  settings.polygons.forEach(validatePolygon);
};

const toUint16Array = (value: unknown): Uint16Array => {
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item) || item < 0 || item > 0xffff)) throw new Error('Polygon data is invalid.');
  return new Uint16Array(value);
};

export function serializeProjectImagePolygonSettings(settings: ProjectImagePolygonSettings): Uint8Array {
  validateSettings(settings);
  const serialized: SerializedProjectImagePolygonSettings = {
    ...settings,
    polygons: settings.polygons.map(({ points, triangles }) => ({ points: Array.from(points), triangles: Array.from(triangles) }))
  };
  return new TextEncoder().encode(JSON.stringify(serialized));
}

export function deserializeProjectImagePolygonSettings(data: Uint8Array): ProjectImagePolygonSettings {
  let serialized: SerializedProjectImagePolygonSettings;
  try {
    serialized = JSON.parse(new TextDecoder().decode(data)) as SerializedProjectImagePolygonSettings;
  } catch {
    throw new Error('Image polygon settings are invalid.');
  }
  const settings: ProjectImagePolygonSettings = {
    ...serialized,
    polygons: serialized.polygons?.map(({ points, triangles }) => ({ points: toUint16Array(points), triangles: toUint16Array(triangles) }))
  };
  validateSettings(settings);
  return settings;
}
