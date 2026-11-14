mod colourblock;
mod colourfit;
mod colourset;
pub mod compress;
mod compress_alpha;
mod math;
pub mod types;

use crate::shared::{CompressResult, TextureEngine};

pub struct Dxt5Engine;

impl TextureEngine for Dxt5Engine {
    fn compressed_size(tex_w: u32, tex_h: u32) -> usize {
        compress::compressed_size(tex_w as usize, tex_h as usize)
    }

    fn compress(rgba: &[u8], tex_w: u32, tex_h: u32, mask: bool, _border: i32) -> CompressResult {
        let tw = tex_w as usize;
        let th = tex_h as usize;
        let n_pixels = tw * th;

        let params = types::Params {
            algorithm: types::Algorithm::IterativeClusterFit,
            weights: types::COLOUR_WEIGHTS_PERCEPTUAL,
            weigh_colour_by_alpha: mask,
        };

        let mut dxt5_buf = vec![0u8; Self::compressed_size(tex_w, tex_h)];
        compress::compress(rgba, tw, th, params, &mut dxt5_buf);

        let mut decompressed = vec![0u8; n_pixels * 4];
        compress::decompress(&dxt5_buf, tw, th, &mut decompressed);

        CompressResult {
            data: dxt5_buf,
            decompressed_rgba: decompressed,
        }
    }

    fn decompress(data: &[u8], tex_w: u32, tex_h: u32) -> Vec<u8> {
        let tw = tex_w as usize;
        let th = tex_h as usize;
        let mut rgba = vec![0u8; tw * th * 4];
        compress::decompress(data, tw, th, &mut rgba);
        rgba
    }

    fn file_extension() -> &'static str {
        "dxt5"
    }
}

impl Dxt5Engine {
    /// Decompress raw DXT5 data without the trait (for WASM API).
    pub fn decompress_raw(data: &[u8], width: usize, height: usize) -> Vec<u8> {
        let mut rgba = vec![0u8; width * height * 4];
        compress::decompress(data, width, height, &mut rgba);
        rgba
    }
}
