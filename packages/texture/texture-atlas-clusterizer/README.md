# Texture Atlas Clusterizer

`core/` contains the Rust implementation and compiles it to `lib/texture-atlas-clusterizer.wasm`. `adapter/` provides the TypeScript-facing clusterizer, which loads that asset and integrates with `atlas-packer`.

Build the core before using a newly generated WASM file, then type-check or build the adapter. The public import remains `texture-atlas-clusterizer`.
