#!/usr/bin/env bash
set -e

PROFILE=${1:-release}

# Keep SIMD enabled for the WASM output without requiring a private .cargo config.
export RUSTFLAGS="${RUSTFLAGS:+${RUSTFLAGS} }-C target-feature=+simd128"

if [ "$PROFILE" = "dev" ]; then
    wasm-pack build --dev --target no-modules --out-dir dist --out-name image-poligonizer
else
    wasm-pack build --target no-modules --out-dir dist --out-name image-poligonizer
fi

mv dist/image-poligonizer_bg.wasm dist/image-polygonizer.wasm
