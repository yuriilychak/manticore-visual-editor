pub mod compress_alpha;
pub mod compress_color;
pub(crate) mod compress_color_enhanced;
pub mod decompress;
pub(crate) mod sort;
pub mod ssim;
pub mod tables;
pub mod types;
pub mod utils;

use crate::shared::{CompressResult, TextureEngine};
use crate::shared::texture;

pub struct Etc2Engine;

/// Convert RGBA buffer to BGRA in-place.
fn rgba_to_bgra(buf: &mut [u8]) {
    for pixel in buf.chunks_exact_mut(4) {
        pixel.swap(0, 2); // R↔B
    }
}

/// Convert BGRA buffer to RGBA in-place (same swap).
fn bgra_to_rgba(buf: &mut [u8]) {
    rgba_to_bgra(buf); // symmetric
}

impl TextureEngine for Etc2Engine {
    fn compressed_size(tex_w: u32, tex_h: u32) -> usize {
        (tex_w as usize) * (tex_h as usize) // 16 bytes per 4×4 block = 1 byte per pixel
    }

    fn compress(rgba: &[u8], tex_w: u32, tex_h: u32, mask: bool, border: i32) -> CompressResult {
        let tw = tex_w as usize;
        let th = tex_h as usize;
        let n_pixels = tw * th;

        // Convert RGBA → BGRA for internal engine.
        let mut bgra = rgba.to_vec();
        rgba_to_bgra(&mut bgra);

        let etc2_size = Self::compressed_size(tex_w, tex_h);
        let mut etc2_buf = vec![0u8; etc2_size];

        // --- Alpha pass ---
        compress_alpha::pack_alpha(&bgra, tw, th, &mut etc2_buf);
        decompress::decompress_alpha_texture(&etc2_buf, &mut bgra, tex_w, tex_h);

        // --- Colour pass ---
        let mut color_buf = bgra.clone();
        if mask {
            texture::outline_alpha(&mut color_buf, tex_w, tex_h, border);
        } else {
            texture::ignore_alpha(&mut color_buf, tex_w, tex_h);
        }
        // outline_alpha / ignore_alpha work on channel index 3 (alpha)
        // which is the same position in both RGBA and BGRA — OK.
        // But outline_alpha also smears R,G,B channels — those are at
        // different indices in BGRA (B=0,G=1,R=2) vs RGBA (R=0,G=1,B=2).
        // The ETC2 engine expects BGRA, and the data is already BGRA
        // after our rgba_to_bgra call, so this is correct.

        compress_color::pack_color(&mut color_buf, tw, th, &mut etc2_buf);

        // --- Decompress full texture for quality comparison ---
        // Colour decompression writes all 4 bytes of each pixel (including alpha=0xFF),
        // so we must decompress alpha and colour into separate buffers, then merge.
        let mut alpha_bgra = vec![0u8; n_pixels * 4];
        decompress::decompress_alpha_texture(&etc2_buf, &mut alpha_bgra, tex_w, tex_h);

        let mut color_bgra = vec![0u8; n_pixels * 4];
        decompress::decompress_color_texture(&etc2_buf, &mut color_bgra, tex_w, tex_h);

        // Merge: take RGB from colour, A from alpha.
        let mut dec_bgra = color_bgra;
        for i in 0..n_pixels {
            dec_bgra[i * 4 + 3] = alpha_bgra[i * 4 + 3];
        }

        // Convert decompressed BGRA → RGBA.
        bgra_to_rgba(&mut dec_bgra);

        CompressResult {
            data: etc2_buf,
            decompressed_rgba: dec_bgra,
        }
    }

    fn decompress(data: &[u8], tex_w: u32, tex_h: u32) -> Vec<u8> {
        let n_pixels = tex_w as usize * tex_h as usize;

        let mut alpha_bgra = vec![0u8; n_pixels * 4];
        decompress::decompress_alpha_texture(data, &mut alpha_bgra, tex_w, tex_h);

        let mut color_bgra = vec![0u8; n_pixels * 4];
        decompress::decompress_color_texture(data, &mut color_bgra, tex_w, tex_h);

        // Merge: RGB from colour, A from alpha.
        for i in 0..n_pixels {
            color_bgra[i * 4 + 3] = alpha_bgra[i * 4 + 3];
        }

        bgra_to_rgba(&mut color_bgra);
        color_bgra
    }

    fn file_extension() -> &'static str {
        "etc2"
    }

    fn init() {
        tables::Tables::init();
    }
}
