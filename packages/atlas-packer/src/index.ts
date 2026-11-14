import { packRectangles } from '../../maxrects-packer/src/rectangles';

export type AtlasImage = { height: number; id: number; width: number };
export type AtlasPlacement = { id: number; rotated: boolean; x: number; y: number };
export type AtlasLayout = { height: number; items: AtlasPlacement[]; width: number };

export const ATLAS_PADDING = 4;
export const MAX_ATLAS_SIZE = 4096;

const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(Math.max(1, value)));

/** Packs cropped image dimensions into the smallest fitting square power-of-two atlas. */
export const packAtlasImages = (images: readonly AtlasImage[]): AtlasLayout | null => {
  if (!images.length) return null;
  const rectangles = images.map(({ height, id, width }) => ({ height: height + ATLAS_PADDING * 2, id, width: width + ATLAS_PADDING * 2 }));
  let size = nextPowerOfTwo(Math.max(
    Math.ceil(Math.sqrt(rectangles.reduce((total, rectangle) => total + rectangle.width * rectangle.height, 0))),
    ...rectangles.flatMap(({ height, width }) => [height, width])
  ));
  while (size <= MAX_ATLAS_SIZE) {
    const placements = packRectangles(rectangles, size);
    if (placements) return {
      height: size,
      items: placements.map(({ id, rotated, x, y }) => ({ id, rotated, x: x + ATLAS_PADDING, y: y + ATLAS_PADDING })),
      width: size
    };
    size *= 2;
  }
  return null;
};
