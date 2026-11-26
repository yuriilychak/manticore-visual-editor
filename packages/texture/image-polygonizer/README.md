# Image Polygonizer

`core/` contains the Rust implementation and builds the WebAssembly module in `core/dist/`. `adapter/` is the TypeScript API consumed by the desktop app. The adapter loads that generated WASM file, exposes the high-level polygonization API, and manages workers.

Run the core build before the adapter build when producing a fresh WASM artifact. Consumers import the unchanged `image-polygonizer` package name; Turborepo discovers both nested workspaces.
