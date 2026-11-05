import { createQuadPolygonSettings, type ProjectImageCrop, type ProjectImagePolygonSettingsInput } from '@manticore/project/image-polygon-settings';
import { type ImageConfig, ImagePolygonizer, PolygonData } from 'image-polygonizer';

const getCropBounds = (pixels: ImageData, alphaThreshold: number) => {
  let minX = pixels.width;
  let minY = pixels.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < pixels.height; y++) {
    for (let x = 0; x < pixels.width; x++) {
      if (pixels.data[(y * pixels.width + x) * 4 + 3] <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0
    ? { height: pixels.height, width: pixels.width, x: 0, y: 0 }
    : { height: maxY - minY + 1, width: maxX - minX + 1, x: minX, y: minY };
};

const createCropCanvas = (sourceBitmap: ImageBitmap, alphaThreshold: number) => {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceBitmap.width;
  sourceCanvas.height = sourceBitmap.height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Could not crop image.');
  sourceContext.drawImage(sourceBitmap, 0, 0);
  const { height, width, x, y } = getCropBounds(sourceContext.getImageData(0, 0, sourceBitmap.width, sourceBitmap.height), alphaThreshold);
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = width;
  cropCanvas.height = height;
  const cropContext = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cropContext) throw new Error('Could not crop image.');
  cropContext.drawImage(sourceBitmap, x, y, width, height, 0, 0, width, height);
  return { crop: { height, width, x, y }, cropCanvas };
};

const getPolygonCrop = (polygons: Uint16Array[], offset: number, alphaCrop: ProjectImageCrop): ProjectImageCrop => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const points of polygons) for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, alphaCrop.x + points[index] - offset);
    minY = Math.min(minY, alphaCrop.y + points[index + 1] - offset);
    maxX = Math.max(maxX, alphaCrop.x + points[index] - offset);
    maxY = Math.max(maxY, alphaCrop.y + points[index + 1] - offset);
  }
  return !Number.isFinite(minX) ? alphaCrop : {
    x: Math.floor(minX), y: Math.floor(minY), width: Math.ceil(maxX) - Math.floor(minX) + 1, height: Math.ceil(maxY) - Math.floor(minY) + 1
  };
};

const createPolygonSettings = async (
  cropCanvas: HTMLCanvasElement,
  alphaCrop: ProjectImageCrop,
  source: { format: string; height: number; width: number },
  { alphaThreshold, generatePolygons, maxPointCount, minimalDistance }: Pick<ImageTransformOptions, 'alphaThreshold' | 'generatePolygons' | 'maxPointCount' | 'minimalDistance'>
) => {
  const settings: ProjectImagePolygonSettingsInput = { alphaThreshold, crop: alphaCrop, maxPointCount, minimalDistance, polygonsApplied: generatePolygons, source };
  if (!generatePolygons) return createQuadPolygonSettings(settings, source);

  const polygonBitmap = await createImageBitmap(cropCanvas);
  const polygonizer = new ImagePolygonizer();
  try {
    await polygonizer.init();
    const polygonConfig: ImageConfig = {
      config: { alphaThreshold: Math.max(1, alphaThreshold), maxPointCount, minimalDistance },
      hasPolygons: false,
      id: 'preview',
      label: 'preview',
      outdated: false,
      polygonInfo: new Uint16Array(0),
      selected: false,
      src: polygonBitmap,
      type: source.format
    };
    const [result] = await polygonizer.polygonize([polygonConfig]);
    const polygonInfo = result?.data;
    if (!polygonInfo) return createQuadPolygonSettings(settings, source);

    const polygonData = PolygonData.getInstance();
    const polygons = polygonData.deserializePolygons(polygonInfo);
    const triangleIndices = polygonData.deserializeTriangles(polygonInfo);
    settings.offset = polygonData.deserializeOffset(polygonInfo);
    const shiftedPolygons = polygons.map((points) => points.map((point, index) => point + (index % 2 ? alphaCrop.y : alphaCrop.x)));
    settings.crop = getPolygonCrop(polygons, settings.offset, alphaCrop);
    settings.polygons = shiftedPolygons.flatMap((points, polygonIndex) => {
      const indices = triangleIndices[polygonIndex];
      if (!points?.length || !indices?.length) return [];
      const triangles = new Uint16Array(indices.length / 3);
      for (let index = 0; index < indices.length; index += 3) {
        triangles[index / 3] = (indices[index] << 10) | (indices[index + 1] << 5) | indices[index + 2];
      }
      return [{ points: new Uint16Array(points), triangles }];
    });
    return settings.polygons.length ? settings : createQuadPolygonSettings(settings, source);
  } finally {
    polygonBitmap.close();
    polygonizer.cancel();
  }
};

type ImageTransformOptions = {
  alphaThreshold: number;
  format: string;
  generatePolygons: boolean;
  maxPointCount: number;
  minimalDistance: number;
};

export const createImageUpdate = async (source: ArrayBuffer, options: ImageTransformOptions) => {
  const sourceBitmap = await createImageBitmap(new Blob([source], { type: `image/${options.format}` }));
  try {
    const { crop, cropCanvas } = createCropCanvas(sourceBitmap, options.alphaThreshold);
    return createPolygonSettings(cropCanvas, crop, { format: options.format, height: sourceBitmap.height, width: sourceBitmap.width }, options);
  } finally {
    sourceBitmap.close();
  }
};
