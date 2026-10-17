import { type ImageConfig, ImagePolygonizer } from 'image-polygonizer';

type LoadedImage = { content: BlobPart; name: string; path: string; type: string };

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
    const serializedImages = await this.#imagePolygonizer.serializeImageConfigs(
      images.map(({ image }) => image),
      () => undefined
    );

    return new Map(images.map(({ filePath, image }, index) => [filePath, { data: serializedImages[index], preview: image.preview }]));
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
