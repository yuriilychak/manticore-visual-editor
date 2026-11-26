# Texture Compressor

`core/` contains the Rust ETC2/DXT5 compressor and emits the WASM binary to `core/dist/`. `adapter/` contains the TypeScript API, Web Worker, and Rollup output. At runtime the adapter resolves and loads the core's generated binary.

Build the core before the adapter for a fresh artifact. Applications continue to import `texture-compressor` without depending on the internal folder layout.
