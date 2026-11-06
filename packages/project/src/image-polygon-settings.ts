export type ProjectImagePolygon = { points: Uint16Array; triangles: Uint16Array };
export type ProjectImageCrop = { height: number; width: number; x: number; y: number };
export type ProjectImageSource = { format: string; height: number; width: number };
export type ProjectImageSlice9 = { bottom: number; left: number; right: number; top: number };

export type ProjectImagePolygonSettings = {
  alphaThreshold: number;
  maxPointCount: number;
  minimalDistance: number;
  offset: number;
  polygons: ProjectImagePolygon[];
  polygonsApplied: boolean;
  colorMargin: boolean;
  slice9?: ProjectImageSlice9;
  transparentPadding: boolean;
  crop: ProjectImageCrop;
  source: ProjectImageSource;
};

export type ProjectImagePolygonSettingsInput = Omit<ProjectImagePolygonSettings, 'colorMargin' | 'offset' | 'polygons' | 'transparentPadding'> & Partial<Pick<ProjectImagePolygonSettings, 'colorMargin' | 'offset' | 'polygons' | 'transparentPadding'>>;

type SerializedProjectImagePolygonSettings = Omit<ProjectImagePolygonSettings, 'polygons'> & {
  polygons: { points: number[]; triangles: number[] }[];
};

export const DEFAULT_IMAGE_POLYGON_SETTINGS: ProjectImagePolygonSettings = {
  alphaThreshold: 1, colorMargin: false, maxPointCount: 32, minimalDistance: 8, offset: 0, polygons: [], polygonsApplied: false, transparentPadding: false,
  crop: { height: 1, width: 1, x: 0, y: 0 }, source: { format: '', height: 1, width: 1 }
};

export function packTriangleIndices(first: number, second: number, third: number): number {
  if (![first, second, third].every((index) => Number.isInteger(index) && index >= 0 && index < 32)) throw new Error('Triangle index is invalid.');
  return (first << 10) | (second << 5) | third;
}

export function createQuadPolygonSettings(settings: Omit<ProjectImagePolygonSettingsInput, 'crop' | 'source'> & { crop?: ProjectImageCrop }, source: ProjectImageSource): ProjectImagePolygonSettings {
  const crop = settings.crop ?? { height: source.height, width: source.width, x: 0, y: 0 };
  return { ...settings, colorMargin: settings.colorMargin ?? false, crop, source, offset: settings.offset ?? 0, polygons: [{ points: new Uint16Array([crop.x, crop.y, crop.x + crop.width, crop.y, crop.x + crop.width, crop.y + crop.height, crop.x, crop.y + crop.height]), triangles: new Uint16Array([packTriangleIndices(0, 1, 2), packTriangleIndices(0, 2, 3)]) }], transparentPadding: settings.transparentPadding ?? false };
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
  if (typeof settings.colorMargin !== 'boolean' || typeof settings.transparentPadding !== 'boolean' || (settings.colorMargin && settings.transparentPadding)) throw new Error('Image padding settings are invalid.');
  const { crop, source } = settings;
  if (!crop || ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) || crop.width < 1 || crop.height < 1) throw new Error('Image crop is invalid.');
  if (!source || !Number.isInteger(source.width) || !Number.isInteger(source.height) || source.width < 1 || source.height < 1 || !source.format) throw new Error('Image source is invalid.');
  if (settings.slice9 && (!Object.values(settings.slice9).every(Number.isInteger) || settings.slice9.left < 0 || settings.slice9.right < 0 || settings.slice9.top < 0 || settings.slice9.bottom < 0 || settings.slice9.left + settings.slice9.right > crop.width || settings.slice9.top + settings.slice9.bottom > crop.height)) throw new Error('Slice 9 setting is invalid.');
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
    colorMargin: serialized.colorMargin ?? false,
    slice9: typeof serialized.slice9 === 'object' ? serialized.slice9 : undefined,
    transparentPadding: serialized.transparentPadding ?? false,
    polygons: serialized.polygons?.map(({ points, triangles }) => ({ points: toUint16Array(points), triangles: toUint16Array(triangles) }))
  };
  validateSettings(settings);
  return settings;
}
