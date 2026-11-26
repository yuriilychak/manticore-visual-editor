import { PolygonPack, type NestingConfig, type Placement } from 'polygon-pack';

export type PolygonPackingInput = { id: number; points: Float32Array };
export type PolygonPackingPlacement = { id: number; rotation: number; x: number; y: number };
export type PolygonPackingProgress = (completedIterations: number, totalIterations: number) => void;
export type PolygonPackingConfig = NestingConfig;

/** Number of genetic generations evaluated for each candidate atlas size. */
export const POLYGON_PACKING_ITERATIONS = 8;
export const POLYGON_PACKING_COMPLETE_PLACEMENTS = POLYGON_PACKING_ITERATIONS;
type SourcePolygon = number[] & { source: number };

const BIN_SOURCE = -1;
const square = (size: number): SourcePolygon => Object.assign([0, 0, size, 0, size, size, 0, size], { source: BIN_SOURCE });
const part = ({ id, points }: PolygonPackingInput): SourcePolygon => Object.assign(Array.from(points), { source: id });

type LayoutValidation = { layout: PolygonPackingPlacement[] | null; reason?: string };

const completeLayout = (placements: Placement[][] | undefined, inputs: readonly PolygonPackingInput[], sourceIds: readonly unknown[] | undefined): LayoutValidation => {
  if (!placements) return { layout: null, reason: 'The engine did not emit a new best placement.' };
  if (placements.length !== 1) return { layout: null, reason: `Expected one atlas, received ${placements.length}.` };
  if (placements[0].length !== inputs.length) return { layout: null, reason: `Expected ${inputs.length} placements, received ${placements[0].length}.` };
  if (!sourceIds || sourceIds.length !== inputs.length) return { layout: null, reason: 'Could not recover the SVGnest root-to-input mapping.' };
  const inputById = new Map(inputs.map((input) => [input.id, input]));
  const seen = new Set<number>();
  const result = placements[0].map(({ id, rotation, x, y }) => {
    const sourceId = sourceIds[id];
    const input = typeof sourceId === 'number' ? inputById.get(sourceId) : undefined;
    if (!input) return null;
    if (seen.has(id)) return null;
    seen.add(id);
    return { id: input.id, rotation, x, y };
  });
  if (!result.every((placement): placement is PolygonPackingPlacement => placement !== null)) {
    return { layout: null, reason: `The engine returned an unknown or duplicate part index. Valid indexes are 0 through ${inputs.length - 1}.` };
  }
  return { layout: result };
};

/** Adapts SVGnest's worker/WASM polygon engine to the one-square atlas API. */
export const packPolygonsInSquare = async (inputs: readonly PolygonPackingInput[], size: number, config: PolygonPackingConfig, iterations = POLYGON_PACKING_ITERATIONS, onProgress?: PolygonPackingProgress): Promise<PolygonPackingPlacement[] | null> => new Promise((resolve) => {
  if (!inputs.length) { resolve(null); return; }
  const packer = new PolygonPack();
  const bin = square(size);
  const maximumIterations = Math.max(1, iterations);
  let completedIterations = 0;
  let lastCompleteLayout: PolygonPackingPlacement[] | null = null;
  let settled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const finish = (result: PolygonPackingPlacement[] | null) => {
    if (settled) return;
    settled = true;
    if (timeout) clearTimeout(timeout);
    packer.terminate();
    resolve(result);
  };
  try {
    onProgress?.(0, maximumIterations);
    if (!packer.start(config, [bin, ...inputs.map(part)], bin.source, () => undefined, (result) => {
      const placements = result?.placements;
      completedIterations += 1;
      onProgress?.(Math.min(completedIterations, maximumIterations), maximumIterations);
      const sourceIds = packer.placementContext?.tree.map(({ source }) => source);
      const { layout } = completeLayout(placements, inputs, sourceIds);
      if (layout) lastCompleteLayout = layout;
      // Keep the final complete generation, rather than stopping at the first
      // result, so every candidate always receives all requested iterations.
      if (completedIterations >= maximumIterations) finish(lastCompleteLayout);
    })) finish(null);
    // Do not leave a candidate size pending forever if worker initialization fails.
    timeout = setTimeout(() => finish(null), 10_000);
  } catch {
    finish(null);
  }
});
