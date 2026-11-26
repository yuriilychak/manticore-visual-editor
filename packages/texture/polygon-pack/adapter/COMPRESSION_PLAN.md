# PolygonPack binary-compression plan

## Goal

Keep JavaScript-held state and worker transfers compact while retaining `f64`
geometry calculations inside Rust. Coordinate precision within `0.00001` is
acceptable for the supported SVG range (normally below `10,000`).

## TypeScript boundary rule

All PolygonPack transport and retained algorithm state is `Uint8Array`.
`Float64Array` is not exposed by TypeScript protocol functions; Rust/WASM is
the sole boundary that expands bytes into f64 calculation values.

## Current bottlenecks

- Preparation, GA state, NFP cache, jobs, results, and placements are
  semantically encoded as `f64` values.
- The prepared response currently carries geometry for UI hydration and a
  second Rust context representation, duplicating bin/part geometry.
- NFP jobs/results and their retained cache repeatedly transfer coordinates
  as eight-byte values.
- GA state represents placement IDs, counts, rotations, and flags as `f64`.

## Target representation

| Data | Stored and transferred form | Rust calculation form |
| --- | --- | --- |
| Polygon/NFP coordinates | fixed-point `i32` (scale `100,000`) | `f64` |
| Placement x/y/rotation | `f32` | `f64` |
| IDs, source IDs, counts, cache keys | `u32` | integer types |
| Rotation indexes and flags | `u8` / packed bits | integer types |
| RNG seed | `u64` | `u64` |
| Fitness and aggregate area | `f64` | `f64` |
| GUI configuration | existing packed `u32` | decoded configuration |

Every worker message remains a transferable `Uint8Array` with a versioned
binary frame. Rust decodes compact geometry into `f64` only at its algorithm
boundary and serializes it back to compact form only at the worker boundary.

## Migration phases

### 1. Versioned byte-frame infrastructure

Create JavaScript and Rust binary readers/writers with strict bounds checks.
Every frame starts with a version, command, flags, and payload length. Keep
the current f64 protocol as v1 during migration so fixtures can compare both
formats.

Migrate in this order: preparation request/result, generation begin/state,
NFP jobs/results/cache, then placement response. Each phase removes the
corresponding `Float64Array` TypeScript signature and adds frame validation.

## Implementation checklist

- [x] Preparation request: write source polygons directly to a framed
  `Uint8Array` using scaled `i32` coordinates and `u32` metadata.
- [x] Preparation result: retain the prepared tree as a framed `Uint8Array`;
  hydrate UI metadata lazily without f64 protocol views.
- [x] Generation begin/state/continuation: make each an opaque frame and keep
  GA state bytes in JavaScript.
- [x] NFP jobs/results/cache: use compact frames and transfer each job/result
  buffer independently between workers.
- [x] Placement result: return a compact frame; decode only for a new best
  display callback.
- [~] Remove remaining `Float64Array` protocol types from PolygonPack TS and
  cover every frame with malformed-input and round-trip tests.

### 2. Prepared geometry

Replace the current duplicated preparation response with one compact prepared
tree:

- normalized bin and part coordinates encoded as fixed-point `i32`;
- source IDs, point counts, and child counts encoded as `u32`;
- UI hydration reads source/tree metadata without retaining coordinates;
- Rust reconstructs its f64 context from this same tree.

This is first because prepared data is retained in JavaScript and resent for
every generation begin/complete operation.

### 3. NFP jobs, results, and cache

Encode NFP polygon/contour coordinates as fixed-point `i32`, contour/point counts and
cache keys as `u32`, and rotation/inside/hole values as packed flags. Decode
to f64 only within Rust NFP and placement calculations.

### 4. GA state and continuations

Encode genome placement IDs as `u32`, rotation indexes as `u8`, counts as
`u32`, and unevaluated-fitness state as an explicit flag. Keep fitness as
`f64` and RNG seed as `u64`.

### 5. Placement output

Encode placement IDs/counts as `u32` and transforms as `f32`; retain fitness,
placed area, and total area as `f64`. Continue decoding detailed placements
only for a new best GUI result.

### 6. Verification and removal

For every migrated frame type:

- reject malformed, truncated, or unknown-version buffers;
- compare v1 and v2 nesting output within `0.01` coordinate tolerance;
- record byte size for preparation, cache, jobs, results, GA state, and
  placement output;
- remove the corresponding v1 serializer only after its v2 fixtures pass.

## Expected savings

- Coordinate payloads: about 50% smaller (`f64` to `i32`).
- IDs/counts: about 50% smaller (`f64` to `u32`).
- Rotation state: up to 8x smaller (`f64` to `u8`).
- Prepared state: greater than 50% smaller once duplicate UI geometry is
  removed.
