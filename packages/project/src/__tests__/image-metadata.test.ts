import { describe, expect, test } from '@jest/globals';

import { readProjectImageMetadata } from '../image-metadata';

const makeAsset = (pixels: Uint8Array) => {
  const format = new TextEncoder().encode('png');
  const data = new Uint8Array(2 + 2 + 2 + format.length + 25 + 4 + 8 + pixels.length);
  const view = new DataView(data.buffer);
  let offset = 4; // Empty image UUID and label
  view.setUint16(offset, format.length, true);
  offset += 2;
  data.set(format, offset);
  offset += format.length + 25 + 4;
  view.setUint32(offset, 4, true);
  view.setUint32(offset + 4, 3, true);
  data.set(pixels, offset + 8);
  return data;
};

describe('readProjectImageMetadata', () => {
  test('reads binary size, format, real dimensions, and alpha-cropped dimensions', () => {
    const pixels = new Uint8Array(4 * 3 * 4);
    pixels[(1 * 4 + 1) * 4 + 3] = 255;
    pixels[(2 * 4 + 2) * 4 + 3] = 255;
    const data = makeAsset(pixels);

    expect(readProjectImageMetadata(data)).toEqual({
      alphaPolygons: expect.any(Array),
      binarySize: data.byteLength,
      croppedHeight: 2,
      croppedWidth: 2,
      croppedX: 1,
      croppedY: 1,
      format: 'png',
      hasTransparency: true,
      polygonSettings: { alphaThreshold: 0, maxPointCount: 32, minimalDistance: 8, offset: 0, polygons: [], polygonsApplied: false },
      sourceHeight: 3,
      sourceWidth: 4,
      supportsTransparency: true
    });
  });

  test('uses real dimensions for a fully transparent image', () => {
    expect(readProjectImageMetadata(makeAsset(new Uint8Array(4 * 3 * 4)))).toMatchObject({ croppedHeight: 3, croppedWidth: 4, croppedX: 0, croppedY: 0, hasTransparency: true });
  });

  test('rejects truncated assets', () => {
    expect(() => readProjectImageMetadata(new Uint8Array([0, 0]))).toThrow('Image asset is invalid.');
  });
});
