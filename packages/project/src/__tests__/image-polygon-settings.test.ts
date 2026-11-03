import { describe, expect, test } from '@jest/globals';

import { createQuadPolygonSettings, deserializeProjectImagePolygonSettings, serializeProjectImagePolygonSettings } from '../image-polygon-settings';

describe('image polygon settings', () => {
  test('packs the requested fields into three bytes', () => {
    const settings = createQuadPolygonSettings({ alphaThreshold: 254, maxPointCount: 32, minimalDistance: 256, polygonsApplied: true }, 1, 2, 3, 4);

    const packed = serializeProjectImagePolygonSettings(settings);

    expect(new TextDecoder().decode(packed)).toContain('"polygons"');
    expect(deserializeProjectImagePolygonSettings(packed)).toEqual(settings);
  });

  test('supports the lower bounds', () => {
    const settings = createQuadPolygonSettings({ alphaThreshold: 0, maxPointCount: 5, minimalDistance: 1, polygonsApplied: false }, 0, 0, 1, 1);

    expect(deserializeProjectImagePolygonSettings(serializeProjectImagePolygonSettings(settings))).toEqual(settings);
  });
});
