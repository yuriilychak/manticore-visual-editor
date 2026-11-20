export type AtlasImage = { height: number; id: number; width: number };
export type AtlasPolygonImage = AtlasImage & { polygons?: readonly Float32Array[] };
export type AtlasPlacement = { id: number; polygonIndex?: number; rotated: boolean; rotation?: number; x: number; y: number };
export type AtlasLayout = { height: number; items: AtlasPlacement[]; width: number };
export type AtlasPackingInput = { id: number; polygonIndex?: number; points: Float32Array; sourceId: number };
export type PolygonPackingOptions = {
  onError?: (message: string) => void;
  onInput?: (inputs: readonly AtlasPackingInput[], size: number) => void;
  onProgress?: (completedIterations: number, totalIterations: number) => void;
};

/** Empty space around every sprite so adjacent polygons never touch. */
export const ATLAS_PADDING = 2;
export const MAX_ATLAS_SIZE = 5000;
export const MAX_POWER_OF_TWO_ATLAS_SIZE = 4096;
