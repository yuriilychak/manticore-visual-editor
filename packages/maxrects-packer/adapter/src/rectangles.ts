export type PackRectangle = { height: number; id: number; width: number };
export type PackedRectangle = PackRectangle & { rotated: boolean; x: number; y: number };

type FreeRectangle = { height: number; width: number; x: number; y: number };

const intersects = (left: FreeRectangle, right: FreeRectangle) =>
  left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;

const contains = (outer: FreeRectangle, inner: FreeRectangle) =>
  outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.width >= inner.x + inner.width && outer.y + outer.height >= inner.y + inner.height;

const splitFreeRectangles = (freeRectangles: readonly FreeRectangle[], used: FreeRectangle) => {
  const split = freeRectangles.flatMap((free) => {
    if (!intersects(free, used)) return [free];
    const result: FreeRectangle[] = [];
    if (used.x > free.x) result.push({ ...free, width: used.x - free.x });
    if (used.x + used.width < free.x + free.width) result.push({ height: free.height, width: free.x + free.width - (used.x + used.width), x: used.x + used.width, y: free.y });
    if (used.y > free.y) result.push({ height: used.y - free.y, width: free.width, x: free.x, y: free.y });
    if (used.y + used.height < free.y + free.height) result.push({ height: free.y + free.height - (used.y + used.height), width: free.width, x: free.x, y: used.y + used.height });
    return result.filter(({ height, width }) => height > 0 && width > 0);
  });
  return split.filter((free, index) => !split.some((other, otherIndex) => index !== otherIndex && contains(other, free)));
};

/** Packs generic rectangles into one fixed-size square bin using MaxRects best-short-side-fit. */
export const packRectangles = (rectangles: readonly PackRectangle[], size: number, allowRotation = true): PackedRectangle[] | null => {
  let freeRectangles: FreeRectangle[] = [{ height: size, width: size, x: 0, y: 0 }];
  const packed: PackedRectangle[] = [];

  for (const rectangle of [...rectangles].sort((left, right) => right.width * right.height - left.width * left.height)) {
    const candidates = freeRectangles.flatMap((free) => (allowRotation ? [false, true] : [false]).flatMap((rotated) => {
      const width = rotated ? rectangle.height : rectangle.width;
      const height = rotated ? rectangle.width : rectangle.height;
      return width <= free.width && height <= free.height
        ? [{ free, height, rotated, score: Math.min(free.width - width, free.height - height), width }]
        : [];
    }));
    const candidate = candidates.sort((left, right) => left.score - right.score || left.free.y - right.free.y || left.free.x - right.free.x)[0];
    if (!candidate) return null;
    const used = { height: candidate.height, width: candidate.width, x: candidate.free.x, y: candidate.free.y };
    freeRectangles = splitFreeRectangles(freeRectangles, used);
    packed.push({ ...rectangle, ...used, rotated: candidate.rotated });
  }
  return packed;
};
