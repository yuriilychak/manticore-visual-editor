import { describe, expect, test } from '@jest/globals';

import { readProjectImageMetadata } from '../image-metadata';
import { createQuadPolygonSettings } from '../image-polygon-settings';

describe('readProjectImageMetadata', () => {
  test('reads all image dimensions and crop bounds from polygon settings', () => {
    const settings = createQuadPolygonSettings({
      alphaThreshold: 0,
      crop: { height: 9, width: 11, x: -2, y: 3 },
      maxPointCount: 32,
      minimalDistance: 8,
      polygonsApplied: false
    }, { format: 'png', height: 20, width: 30 });

    expect(readProjectImageMetadata(123, settings)).toMatchObject({
      binarySize: 123,
      croppedHeight: 9,
      croppedWidth: 11,
      croppedX: -2,
      croppedY: 3,
      format: 'png',
      sourceHeight: 20,
      sourceWidth: 30,
      supportsTransparency: true
    });
  });
});
