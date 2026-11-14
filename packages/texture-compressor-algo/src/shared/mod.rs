pub mod quality;
pub mod texture;
pub mod types;

/// Result of a texture compression operation.
pub struct CompressResult {
    /// Compressed texture data (raw blocks, no header).
    pub data: Vec<u8>,
    /// Decompressed RGBA pixels for quality comparison.
    pub decompressed_rgba: Vec<u8>,
}

/// Common interface for texture compression engines.
pub trait TextureEngine {
    /// Byte size of the compressed output for a texture of given dimensions.
    fn compressed_size(tex_w: u32, tex_h: u32) -> usize;

    /// Compress an RGBA image and return compressed data + decompressed RGBA.
    ///
    /// `rgba` must be padded to texture dimensions (multiples of 4).
    /// `mask`: if true, use alpha-aware compression; if false, ignore alpha.
    /// `border`: alpha outline radius (used by ETC2; ignored by DXT5).
    fn compress(rgba: &[u8], tex_w: u32, tex_h: u32, mask: bool, border: i32) -> CompressResult;

    /// Decompress raw texture data back to RGBA pixels.
    fn decompress(data: &[u8], tex_w: u32, tex_h: u32) -> Vec<u8>;

    /// File extension for the compressed format (e.g. "etc2", "dxt5").
    fn file_extension() -> &'static str;

    /// One-time initialization (e.g. lookup tables). No-op if not needed.
    fn init() {}
}
