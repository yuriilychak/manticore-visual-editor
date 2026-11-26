# Polygon Pack

`core/` owns the Rust/WASM no-fit-polygon engine. `adapter/` owns the TypeScript placement API and browser worker bundle. The adapter build invokes the core build, bundles the worker, and copies the generated WASM into the desktop application's public worker assets.

Consumers continue to import `polygon-pack`. The core workspace retains its existing `poygon-pack-algo` package name for compatibility.
