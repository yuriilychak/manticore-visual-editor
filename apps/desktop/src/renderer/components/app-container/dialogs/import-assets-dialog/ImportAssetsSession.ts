import { createQuadPolygonSettings, serializeProjectImagePolygonSettings } from '@manticore/project/image-polygon-settings';
import { type ImageConfig, ImagePolygonizer } from 'image-polygonizer';

type LoadedImage = { content: BlobPart; name: string; path: string; type: string };

const getAlphaCrop = (bitmap: ImageBitmap) => {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read image alpha.');
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  let minX = bitmap.width, minY = bitmap.height, maxX = -1, maxY = -1;
  for (let y = 0; y < bitmap.height; ++y) for (let x = 0; x < bitmap.width; ++x) {
    if (data[(y * bitmap.width + x) * 4 + 3] <= 1) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return maxX < 0
    ? { height: bitmap.height, width: bitmap.width, x: 0, y: 0 }
    : { height: maxY - minY + 1, width: maxX - minX + 1, x: minX, y: minY };
};

export class ImportAssetsSession {
  readonly #imageConfigs = new Map<string, ImageConfig>();
  readonly #imagePolygonizer = new ImagePolygonizer();
  readonly #previewUrls = new Map<string, string>();

  async importImages(loadedImages: readonly LoadedImage[]) {
    const files = loadedImages.map(({ content, name, type }) => new File([content], name, { type }));
    const imageConfigs = await this.#imagePolygonizer.importImages(files as unknown as FileList);
    const previewUrls: Record<string, string> = {};

    imageConfigs.forEach((image, index) => {
      const path = loadedImages[index].path;
      this.remove(path);
      this.#imageConfigs.set(path, image);
      if (!image.preview) return;

      const previewUrl = URL.createObjectURL(new Blob([new Uint8Array(image.preview)], { type: 'image/png' }));
      this.#previewUrls.set(path, previewUrl);
      previewUrls[path] = previewUrl;
    });

    return previewUrls;
  }

  async serializeImages(filePaths: readonly string[]) {
    const images = filePaths.flatMap((filePath) => {
      const image = this.#imageConfigs.get(filePath);
      return image ? [{ filePath, image }] : [];
    });
    return new Map(images.map(({ filePath, image }) => [filePath, {
      polygonSettings: serializeProjectImagePolygonSettings(createQuadPolygonSettings({
        alphaThreshold: 1,
        crop: getAlphaCrop(image.src),
        maxPointCount: 32,
        minimalDistance: 8,
        polygonsApplied: false
      }, { format: image.type, height: image.src.height, width: image.src.width }))
    }]));
  }

  remove(filePath: string) {
    this.#imageConfigs.get(filePath)?.src.close();
    this.#imageConfigs.delete(filePath);
    const previewUrl = this.#previewUrls.get(filePath);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    this.#previewUrls.delete(filePath);
  }

  clear() {
    this.#imageConfigs.forEach((image) => image.src.close());
    this.#imageConfigs.clear();
    this.#previewUrls.forEach((url) => URL.revokeObjectURL(url));
    this.#previewUrls.clear();
  }

  dispose() {
    this.clear();
    this.#imagePolygonizer.cancel();
  }
}
