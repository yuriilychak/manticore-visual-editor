# Texture packages

This folder groups the packages that transform source images into packed, optimized texture atlases for the editor. Keeping them together makes the texture pipeline explicit and leaves `packages/` available for other product domains, such as particles, fonts, and animations.

## Current atlas pipeline

1. `image-polygonizer` optionally derives opaque polygons from source images.
2. `atlas-packer` places rectangular or polygonal image regions into atlas pages.
3. `texture-atlas-clusterizer` expands sprite edge colors into transparent padding to prevent texture bleeding.
4. `texture-compressor` encodes completed atlas pages as ETC2 or DXT5 textures.

The packages use the same two-layer layout where applicable:

- `adapter/` is the TypeScript/browser-facing API, including workers and WASM loading.
- `core/` is the Rust/WASM implementation of the CPU-intensive algorithm.

## Packages

### `atlas-packer`

The high-level atlas orchestration API used by the editor. It selects the appropriate packing strategy and combines the lower-level rectangle and polygon packers into atlas placement results.

### `image-polygonizer`

Converts image alpha masks into simplified polygons and triangulation data. Polygon data can improve packing efficiency and is retained with the image project data.

### `maxrects-packer`

Provides fast rectangle-based bin packing using the MaxRects algorithm. It is used when atlas content can be packed as rectangles and exposes browser workers for parallel work.

### `polygon-pack`

Provides no-fit-polygon placement and nesting for irregular image shapes. It is used for polygon-aware packing where rectangle packing would waste too much atlas space.

### `texture-atlas-clusterizer`

Processes atlas sprite clusters to add color margins around transparent edges. This avoids color bleeding between sprites when GPUs sample, filter, or mipmap atlas textures.

### `texture-compressor`

Compresses completed atlas pixels to GPU-friendly ETC2 and DXT5 formats. Compression runs in workers so long-running image work does not block the editor UI.

## Adding related packages

Place a package here when its primary responsibility is image processing, texture preparation, atlas construction, or GPU texture encoding. Keep general project data and future non-texture domains outside this folder.
