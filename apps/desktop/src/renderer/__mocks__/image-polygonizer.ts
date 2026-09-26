import { jest } from '@jest/globals';

export class ImagePolygonizer {
  importImages = jest.fn(async () => []);
  serializeImageConfigs = jest.fn(async () => []);
}

export type ImageConfig = {
  src: ImageBitmap;
};
