import type { ProjectImagePolygonSettingsInput } from '@manticore/project';
import { type ImageConfig, ImagePolygonizer, PolygonData } from 'image-polygonizer';

const STORED_PREVIEW_SIZE = 256;

export const toPng = (canvas: HTMLCanvasElement) => new Promise<Uint8Array>((resolve, reject) => {
  canvas.toBlob(async (blob) => {
    if (!blob) {
      reject(new Error('Could not encode image preview.'));
      return;
    }
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, 'image/png');
});

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
  return { cropCanvas, cropContext };
};

const createPreview = async (cropCanvas: HTMLCanvasElement) => {
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = STORED_PREVIEW_SIZE;
  previewCanvas.height = STORED_PREVIEW_SIZE;
  const previewContext = previewCanvas.getContext('2d');
  if (!previewContext) throw new Error('Could not create image preview.');
  const scale = Math.min(STORED_PREVIEW_SIZE / cropCanvas.width, STORED_PREVIEW_SIZE / cropCanvas.height);
  const width = cropCanvas.width * scale;
  const height = cropCanvas.height * scale;
  previewContext.drawImage(cropCanvas, (STORED_PREVIEW_SIZE - width) / 2, (STORED_PREVIEW_SIZE - height) / 2, width, height);
  return toPng(previewCanvas);
};

const createPolygonSettings = async (
  cropCanvas: HTMLCanvasElement,
  format: string,
  { alphaThreshold, generatePolygons, maxPointCount, minimalDistance }: Pick<ImageTransformOptions, 'alphaThreshold' | 'generatePolygons' | 'maxPointCount' | 'minimalDistance'>
) => {
  const settings: ProjectImagePolygonSettingsInput = { alphaThreshold, maxPointCount, minimalDistance, polygonsApplied: generatePolygons };
  if (!generatePolygons) return settings;

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
      type: format
    };
    const [result] = await polygonizer.polygonize([polygonConfig]);
    const polygonInfo = result?.data;
    if (!polygonInfo) return settings;

    const polygonData = PolygonData.getInstance();
    const polygons = polygonData.deserializePolygons(polygonInfo);
    const triangleIndices = polygonData.deserializeTriangles(polygonInfo);
    settings.offset = polygonData.deserializeOffset(polygonInfo);
    settings.polygons = polygons.flatMap((points, polygonIndex) => {
      const indices = triangleIndices[polygonIndex];
      if (!points?.length || !indices?.length) return [];
      const triangles = new Uint16Array(indices.length / 3);
      for (let index = 0; index < indices.length; index += 3) {
        triangles[index / 3] = (indices[index] << 10) | (indices[index + 1] << 5) | indices[index + 2];
      }
      return [{ points: new Uint16Array(points), triangles }];
    });
    return settings;
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
    const { cropCanvas, cropContext } = createCropCanvas(sourceBitmap, options.alphaThreshold);
    const [preview, settings] = await Promise.all([
      createPreview(cropCanvas),
      createPolygonSettings(cropCanvas, options.format, options)
    ]);
    return {
      image: {
        height: cropCanvas.height,
        pixels: new Uint8Array(cropContext.getImageData(0, 0, cropCanvas.width, cropCanvas.height).data),
        preview,
        width: cropCanvas.width
      },
      settings
    };
  } finally {
    sourceBitmap.close();
  }
};
