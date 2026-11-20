export type PolygonPackConfig = { curveTolerance: number; spacing: number; rotations: number; populationSize: number; mutationRate: number; useHoles: boolean };
export type PolygonPackPlacement = { id: number; x: number; y: number; rotation: number };
export type PolygonPackContext = { tree: Array<{ source?: unknown }> };
export declare class PolygonPack {
  working: boolean;
  setParts(polygons: (number[] & { source?: unknown })[]): void;
  setBin(source: unknown): boolean;
  start(progressCallback: (progress: number) => void, displayCallback: (placements?: PolygonPackPlacement[][], ratio?: number, placedParts?: number, totalParts?: number) => void): boolean;
  stop(): void;
  terminate(): void;
  config(config: PolygonPackConfig): boolean;
  getPlacementContext(): PolygonPackContext | null;
}
