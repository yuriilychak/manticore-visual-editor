import type { ProjectImagePolygonSettings } from './image-polygon-settings';

export type ProjectImageMetadata = {
  alphaPolygons: number[][];
  binarySize: number;
  croppedHeight: number;
  croppedWidth: number;
  croppedX: number;
  croppedY: number;
  format: string;
  hasTransparency: boolean;
  polygonSettings: ProjectImagePolygonSettings;
  sourceHeight: number;
  sourceWidth: number;
  supportsTransparency: boolean;
};

const TRANSPARENCY_FORMATS = new Set(['avif', 'gif', 'png', 'svg+xml', 'webp']);

/** Image metadata is fully described by polygon settings; only the source size is read from disk. */
export function readProjectImageMetadata(binarySize: number, polygonSettings: ProjectImagePolygonSettings): ProjectImageMetadata {
  const { crop, source } = polygonSettings;
  const supportsTransparency = TRANSPARENCY_FORMATS.has(source.format);
  return {
    alphaPolygons: [],
    binarySize,
    croppedHeight: crop.height,
    croppedWidth: crop.width,
    croppedX: crop.x,
    croppedY: crop.y,
    format: source.format,
    hasTransparency: supportsTransparency,
    polygonSettings,
    sourceHeight: source.height,
    sourceWidth: source.width,
    supportsTransparency
  };
}
