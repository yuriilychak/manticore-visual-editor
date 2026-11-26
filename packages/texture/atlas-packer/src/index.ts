import { isQuadAtlas, packPolygonAtlasImages } from './polygon-atlas-packing';
import { packQuadAtlasImages } from './quad-atlas-packing';
import type { AtlasLayout, AtlasPolygonImage, PolygonPackingOptions } from './types';

export type { AtlasImage, AtlasLayout, AtlasPackingInput, AtlasPlacement, AtlasPolygonImage, PolygonPackingOptions } from './types';
export { ATLAS_PADDING, MAX_ATLAS_SIZE, MAX_POWER_OF_TWO_ATLAS_SIZE } from './types';

/** Packs cropped image dimensions using the rectangular atlas algorithm. */
export const packAtlasImages = packQuadAtlasImages;

/** Selects the sole atlas-generation step that differs: quad or polygon packing. */
export const packAtlasImagesWithPolygons = async (images: readonly AtlasPolygonImage[], options: PolygonPackingOptions = {}): Promise<AtlasLayout | null> => {
  if (isQuadAtlas(images)) return packQuadAtlasImages(images);
  const layout = await packPolygonAtlasImages(images, options);
  if (!layout) options.onError?.('Polygons do not fit within one 4096 × 4096 atlas.');
  options.onProgress?.(1, 1);
  return layout;
};
