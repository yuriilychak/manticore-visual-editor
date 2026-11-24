import { describe, expect, test } from '@jest/globals';

import { toPoint } from '../ImageDetails/PolygonEditorDialog/helpers';

const canvas = {
  getBoundingClientRect: () => ({ height: 480, left: 0, top: 0, width: 720 }),
  height: 480,
  width: 720
} as HTMLCanvasElement;

const bitmap = { height: 200, width: 400 } as ImageBitmap;

describe('polygon editor coordinate conversion', () => {
  test('maps a zoomed canvas position to integer image coordinates', () => {
    expect(toPoint(canvas, bitmap, 0.25, { clientX: 279.6, clientY: 215.7 })).toEqual({
      point: { x: 21, y: 46 },
      scale: 0.45
    });
  });

  test('keeps image-space coordinates integral at high zoom', () => {
    expect(toPoint(canvas, bitmap, 4, { clientX: 361.1, clientY: 241.6 })?.point).toEqual({ x: 200, y: 100 });
  });
});
