/** GPU compressed format emitted by the compressor. */
export type TextureCompressionFormat = 'etc2' | 'dxt5';

export interface TextureCompressionMetrics {
    alphaPsnr: number;
    alphaSsim: number;
    colorWeightedPsnr: number;
    colorWeightedSsim: number;
}

export interface TextureCompressionOptions {
    /** RGBA pixels in straight-alpha representation. */
    pixels: Uint8Array;
    width: number;
    height: number;
    /** ETC2 only: preserve a 2px alpha outline instead of the default 1px outline. */
    retina?: boolean;
    /** Do not weigh RGB fitting by alpha. */
    ignoreAlphaMask?: boolean;
    /** Include decompressed RGBA data for visual quality inspection. */
    debug?: boolean;
}

export interface TextureCompressionResult {
    format: TextureCompressionFormat;
    /** Power-of-two dimensions used by the compressed GPU texture. */
    width: number;
    height: number;
    /** 16 bytes per 4×4 block; ETC2 RGBA8 or BC3/DXT5 data. */
    data: Uint8Array;
    metrics: TextureCompressionMetrics;
    /** Decompressed RGBA debug image, supplied only when `debug` is true. */
    debugRgba?: Uint8Array;
}

export interface TextureCompressorOptions {
    /** URL or factory for the bundled module worker. */
    workerSource: string | URL | (() => Worker);
    /** Fetch URL for the WASM binary. Mutually exclusive with `wasmBinary`. */
    wasmUrl?: string | URL;
    /** Pre-fetched WASM binary. Mutually exclusive with `wasmUrl`. */
    wasmBinary?: ArrayBuffer;
    /** Worker count. Defaults to available hardware concurrency, capped by block count. */
    numWorkers?: number;
}
