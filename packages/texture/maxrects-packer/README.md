# MaxRects Packer

`core/` is the Rust/WASM MaxRects algorithm. Its build produces `lib/maxrects-packer.wasm`. `adapter/` contains the TypeScript API, worker entry point, and Rollup build that publishes the JavaScript and declarations alongside that WASM asset.

Build `core/` first, then `adapter/`. Applications keep importing `maxrects-packer`; only the repository layout has changed.
