const TYPE_GA = 0;
const TYPE_PREPARE = 3;
const BEGIN_GENERATION = 5;
const COMPLETE_GENERATION = 6;

const SPACING_SHIFT = 7;
const ROTATIONS_SHIFT = 12;
const POPULATION_SHIFT = 17;
const MUTATION_SHIFT = 24;
const USE_HOLES_MASK = 0x80000000;

function integer(value, minimum, maximum) {
	return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : null;
}

/** Packs the complete GUI configuration into one Float64-safe uint32. */
export function packWorkerConfig(config) {
	const curveTolerance = Math.round(config.curveTolerance * 100);
	if (!Number.isFinite(config.curveTolerance) || Math.abs(config.curveTolerance * 100 - curveTolerance) > 1e-9 ||
		integer(curveTolerance, 10, 100) === null || integer(config.spacing, 0, 16) === null ||
		integer(config.rotations, 1, 16) === null || integer(config.populationSize, 3, 64) === null ||
		integer(config.mutationRate, 2, 64) === null) return 0;
	return (curveTolerance |
		(config.spacing << SPACING_SHIFT) |
		(config.rotations << ROTATIONS_SHIFT) |
		(config.populationSize << POPULATION_SHIFT) |
		(config.mutationRate << MUTATION_SHIFT) |
		(config.useHoles ? USE_HOLES_MASK : 0)) >>> 0;
}

function serializePolygon(values, polygon) {
	values.push(polygon.length / 2);
	values.push(...polygon);
}

/** Packs raw source geometry for Rust preparation. */
export function serializePreparationRequest({ bin, parts, workerConfig }) {
	const values = [TYPE_PREPARE, workerConfig, parts.length];
	serializePolygon(values, bin);
	for (let index = 0; index < parts.length; index++) {
		values.push(index);
		serializePolygon(values, parts[index]);
	}
	return new Float64Array(values);
}

function deserializePolygon(serialized, index, parts, nextId) {
	const sourceIndex = serialized[index++];
	const pointCount = serialized[index++];
	const childCount = serialized[index++];
	const polygon = [];
	for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
		polygon.push({ x: serialized[index++], y: serialized[index++] });
	}
	polygon.source = parts[sourceIndex]?.source;
	polygon.id = nextId.value++;
	polygon.children = [];
	for (let childIndex = 0; childIndex < childCount; childIndex++) {
		const child = deserializePolygon(serialized, index, parts, nextId);
		polygon.children.push(child.polygon);
		index = child.index;
	}
	polygon.childNodes = polygon.children;
	return { polygon, index };
}

/** Hydrates Rust's preparation response only for SVG rendering. */
export function deserializePreparationResult(serialized, parts) {
	if (!(serialized instanceof Float64Array) || serialized[0] !== 1) return null;
	let index = 1;
	const bounds = {
		x: serialized[index++], y: serialized[index++],
		width: serialized[index++], height: serialized[index++]
	};
	const pointCount = serialized[index++];
	if (!Number.isSafeInteger(pointCount) || pointCount < 3) return null;
	index += pointCount * 2;
	if (index > serialized.length) return null;
	const rootCount = serialized[index++];
	const tree = [];
	const nextId = { value: 0 };
	for (let rootIndex = 0; rootIndex < rootCount; rootIndex++) {
		const root = deserializePolygon(serialized, index, parts, nextId);
		root.polygon.id = rootIndex;
		tree.push(root.polygon);
		index = root.index;
	}
	const contextLength = serialized[index++];
	if (!Number.isSafeInteger(contextLength) || contextLength < 1) return null;
	const contextEnd = index + contextLength;
	if (contextEnd !== serialized.length || serialized[index] !== 1) return null;
	return { bounds, tree };
}

function opaqueBuffer(value, allowEmpty = false) {
	return value instanceof Float64Array && (allowEmpty || value.length > 0) ? value : null;
}

export function serializeGenerationBegin({ workerConfig, preparation, state, cacheState }) {
	const prepared = opaqueBuffer(preparation);
	const generationState = opaqueBuffer(state, true);
	const cache = opaqueBuffer(cacheState);
	if (!prepared || !generationState || !cache) return new Float64Array();
	return new Float64Array([
		TYPE_GA, BEGIN_GENERATION, workerConfig,
		prepared.length, ...prepared,
		generationState.length, ...generationState,
		...cache
	]);
}

export function deserializeGenerationBegin(serialized) {
	if (!(serialized instanceof Float64Array) || serialized[0] !== 1) return null;
	let index = 1;
	const continuationLength = serialized[index++];
	if (!Number.isSafeInteger(continuationLength) || continuationLength < 1) return null;
	const continuationEnd = index + continuationLength;
	if (continuationEnd > serialized.length) return null;
	const continuation = serialized.slice(index, continuationEnd);
	index = continuationEnd;
	const jobCount = serialized[index++];
	if (!Number.isSafeInteger(jobCount) || jobCount < 0) return null;
	const jobs = [];
	for (let jobIndex = 0; jobIndex < jobCount; jobIndex++) {
		const length = serialized[index++];
		if (!Number.isSafeInteger(length) || length < 1 || index + length > serialized.length) return null;
		jobs.push(serialized.slice(index, index + length));
		index += length;
	}
	return index === serialized.length ? { continuation, jobs } : null;
}

export function serializeGenerationComplete({ workerConfig, preparation, continuation, results }) {
	const prepared = opaqueBuffer(preparation);
	const next = opaqueBuffer(continuation);
	if (!prepared || !next || !Array.isArray(results) || results.some((result) => !(result instanceof Float64Array))) {
		return new Float64Array();
	}
	const values = [
		TYPE_GA, COMPLETE_GENERATION, workerConfig,
		prepared.length, ...prepared,
		next.length, ...next,
		results.length
	];
	for (const result of results) values.push(result.length, ...result);
	return new Float64Array(values);
}

function deserializePlacement(serialized) {
	const placements = [];
	let placedCount = 0;
	let index = 4;
	for (let binIndex = 0; binIndex < serialized[3]; binIndex++) {
		const placementCount = serialized[index++];
		placedCount += placementCount;
		const bin = [];
		for (let placementIndex = 0; placementIndex < placementCount; placementIndex++) {
			bin.push({
				id: serialized[index++],
				x: serialized[index++],
				y: serialized[index++],
				rotation: serialized[index++]
			});
		}
		placements.push(bin);
	}
	return {
		fitness: serialized[0],
		placements,
		placedArea: serialized[1],
		totalArea: serialized[2] * serialized[3],
		placedCount
	};
}

export function deserializeGenerationComplete(serialized) {
	if (!(serialized instanceof Float64Array) || serialized[0] !== 1) return null;
	let index = 1;
	const stateLength = serialized[index++];
	if (!Number.isSafeInteger(stateLength) || stateLength < 1 || index + stateLength > serialized.length) return null;
	const state = serialized.slice(index, index + stateLength);
	index += stateLength;
	const cacheLength = serialized[index++];
	if (!Number.isSafeInteger(cacheLength) || cacheLength < 1 || index + cacheLength >= serialized.length) return null;
	const cacheState = serialized.slice(index, index + cacheLength);
	index += cacheLength;
	const partCount = serialized[index++];
	if (!Number.isSafeInteger(partCount) || partCount < 0) return null;
	const placement = deserializePlacement(serialized.subarray(index));
	return Number.isFinite(placement?.fitness) ? { state, cacheState, partCount, placement } : null;
}
