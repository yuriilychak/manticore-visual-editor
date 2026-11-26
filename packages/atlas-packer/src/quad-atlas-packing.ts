import { packRectangles } from '../../maxrects-packer/adapter/src/rectangles';
import { ATLAS_PADDING, MAX_ATLAS_SIZE, MAX_POWER_OF_TWO_ATLAS_SIZE, type AtlasImage, type AtlasLayout } from './types';

const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(Math.max(1, value)));

/** Packs cropped image dimensions into the smallest fitting square, using 5000 only as a final overflow probe. */
export const packQuadAtlasImages = (images: readonly AtlasImage[]): AtlasLayout | null => {
  if (!images.length) return null;
  const rectangles = images.map(({ height, id, width }) => ({ height: height + ATLAS_PADDING * 2, id, width: width + ATLAS_PADDING * 2 }));
  let size = nextPowerOfTwo(Math.max(
    Math.ceil(Math.sqrt(rectangles.reduce((total, rectangle) => total + rectangle.width * rectangle.height, 0))),
    ...rectangles.flatMap(({ height, width }) => [height, width])
  ));
  while (size <= MAX_POWER_OF_TWO_ATLAS_SIZE) {
    const placements = packRectangles(rectangles, size, true);
    if (placements) return {
      height: size,
      items: placements.map(({ id, rotated, x, y }) => ({ id, rotated, x: x + ATLAS_PADDING, y: y + ATLAS_PADDING })),
      width: size
    };
    size *= 2;
  }
  if (MAX_ATLAS_SIZE > MAX_POWER_OF_TWO_ATLAS_SIZE) {
    const placements = packRectangles(rectangles, MAX_ATLAS_SIZE, true);
    if (placements) return {
      height: MAX_ATLAS_SIZE,
      items: placements.map(({ id, rotated, x, y }) => ({ id, rotated, x: x + ATLAS_PADDING, y: y + ATLAS_PADDING })),
      width: MAX_ATLAS_SIZE
    };
  }
  return null;
};
