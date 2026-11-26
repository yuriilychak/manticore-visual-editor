//! Unified WASM API for ETC2 and DXT5 texture compression via WebWorkers.
//!
//! # Pipeline (same for both formats)
//!
//! 1. Main thread: `tex_init(format)` — initialize once per worker
//! 2. Main thread: `etc2_prepare()` / `dxt5_prepare()` — serialize block data
//! 3. WebWorker:   `etc2_compress_chunk()` / `dxt5_compress_chunk()` — compress blocks
//! 4. Main thread: `tex_finalize()` — assemble output + metrics (shared for both formats)

use wasm_bindgen::prelude::*;

use crate::dxt5;
use crate::etc2;
use crate::shared::quality;
use crate::shared::texture;

// ── tex_init ────────────────────────────────────────────────────────────────

/// Initialize compression tables. Call once per WebWorker.
///
/// `format`: 0 = ETC2, 1 = DXT5
#[wasm_bindgen]
pub fn tex_init(format: u8) {
    console_error_panic_hook::set_once();
    if format == 0 {
        etc2::tables::Tables::init();
    }
    // DXT5 has no init step.
}

// ── etc2_prepare ────────────────────────────────────────────────────────────

/// Prepare ETC2 block data for distribution to WebWorkers.
///
/// Input: RGBA pixels (4 bytes/pixel), image width/height, flags.
/// Output: `[tex_w:u16 LE, tex_h:u16 LE]` + 80 bytes per block
///         `[bgra_masked: 64, original_alpha: 16]`
#[wasm_bindgen]
pub fn etc2_prepare(
    rgba: &[u8],
    width: u16,
    height: u16,
    retina: bool,
    nomask: bool,
) -> Vec<u8> {
    let w = width as u32;
    let h = height as u32;
    let tex_w = texture::texture_dim(w);
    let tex_h = texture::texture_dim(h);

    // Convert RGBA → BGRA (browser gives RGBA, ETC2 engine expects BGRA)
    let mut bgra = Vec::with_capacity(rgba.len());
    for px in rgba.chunks_exact(4) {
        bgra.push(px[2]); // B
        bgra.push(px[1]); // G
        bgra.push(px[0]); // R
        bgra.push(px[3]); // A
    }

    // Pad to texture dimensions
    let padded = texture::pad_to_texture(&bgra, w, h, tex_w, tex_h);

    let tw = tex_w as usize;
    let th = tex_h as usize;
    let n_pixels = tw * th;
    let original_alpha: Vec<u8> = (0..n_pixels).map(|i| padded[i * 4 + 3]).collect();

    // Apply alpha mask for color compression
    let mut color_buf = padded;
    if nomask {
        texture::ignore_alpha(&mut color_buf, tex_w, tex_h);
    } else {
        let border = if retina { 2 } else { 1 };
        texture::outline_alpha(&mut color_buf, tex_w, tex_h, border);
    }

    // Extract per-block data
    let blocks_x = tw / 4;
    let blocks_y = th / 4;
    let num_blocks = blocks_x * blocks_y;
    let stride = tw * 4;

    let mut out = Vec::with_capacity(4 + num_blocks * 80);
    out.extend_from_slice(&(tex_w as u16).to_le_bytes());
    out.extend_from_slice(&(tex_h as u16).to_le_bytes());

    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            for row in 0..4 {
                let src = ((by * 4 + row) * stride) + bx * 4 * 4;
                out.extend_from_slice(&color_buf[src..src + 16]);
            }
            for row in 0..4 {
                for col in 0..4 {
                    let pixel = (by * 4 + row) * tw + (bx * 4 + col);
                    out.push(original_alpha[pixel]);
                }
            }
        }
    }

    out
}

// ── etc2_compress_chunk ─────────────────────────────────────────────────────

/// Compress a chunk of ETC2 blocks in a WebWorker.
///
/// Input:  N × 80 bytes `[bgra_masked:64, alpha:16]`
/// Output: N × 40 bytes `[alpha_etc2:8, color_etc2:8,
///          alpha_mse:i32, alpha_ssim:f64, color_mse:i32, color_ssim:f64]`
#[wasm_bindgen]
pub fn etc2_compress_chunk(chunk: &[u8]) -> Vec<u8> {
    let block_in = 80;
    let block_out = 40;
    let num_blocks = chunk.len() / block_in;

    let mut out = Vec::with_capacity(num_blocks * block_out);
    let mut ga = etc2::compress_color::new_adjust_group();
    let mut gb = etc2::compress_color::new_adjust_group();

    for i in 0..num_blocks {
        let block = &chunk[i * block_in..(i + 1) * block_in];
        let bgra_masked = &block[0..64];
        let orig_alpha = &block[64..80];

        // Alpha compression
        let mut alpha_etc2 = [0u8; 8];
        etc2::compress_alpha::compress_block_alpha_from_raw(&mut alpha_etc2, orig_alpha);

        // Decompress alpha for SSIM
        let mut decomp_alpha = [0u8; 64];
        etc2::decompress::decompress_block_alpha(&alpha_etc2, &mut decomp_alpha, 16);

        // Alpha SSIM
        let mut orig_alpha_bgra = [0u8; 64];
        for p in 0..16 {
            orig_alpha_bgra[p * 4 + 3] = orig_alpha[p];
        }
        let alpha_ssim = etc2::ssim::compare_blocks_alpha_ssim(
            &orig_alpha_bgra, 16,
            &decomp_alpha, 16,
        );

        // Alpha MSE
        let mut alpha_mse: i32 = 0;
        for p in 0..16 {
            let d = orig_alpha[p] as i32 - decomp_alpha[p * 4 + 3] as i32;
            alpha_mse += d * d;
        }

        // Color compression
        let mut color_etc2 = [0u8; 8];
        let (color_mse, color_ssim) = etc2::compress_color::compress_block_color_from_raw(
            &mut color_etc2,
            bgra_masked,
            &mut ga,
            &mut gb,
        );

        // Serialize output
        out.extend_from_slice(&alpha_etc2);
        out.extend_from_slice(&color_etc2);
        out.extend_from_slice(&alpha_mse.to_le_bytes());
        out.extend_from_slice(&alpha_ssim.to_le_bytes());
        out.extend_from_slice(&(color_mse as i32).to_le_bytes());
        out.extend_from_slice(&color_ssim.to_le_bytes());
    }

    out
}

// ── dxt5_prepare ────────────────────────────────────────────────────────────

/// Prepare DXT5 block data for distribution to WebWorkers.
///
/// Input: RGBA pixels (4 bytes/pixel), image width/height, flags.
/// Output: `[tex_w:u16 LE, tex_h:u16 LE]` + 64 bytes per block (RGBA pixels)
#[wasm_bindgen]
pub fn dxt5_prepare(
    rgba: &[u8],
    width: u16,
    height: u16,
    nomask: bool,
) -> Vec<u8> {
    let w = width as u32;
    let h = height as u32;
    let tex_w = texture::texture_dim(w);
    let tex_h = texture::texture_dim(h);

    let padded = texture::pad_to_texture(rgba, w, h, tex_w, tex_h);

    let tw = tex_w as usize;
    let th = tex_h as usize;
    let blocks_x = tw / 4;
    let blocks_y = th / 4;
    let num_blocks = blocks_x * blocks_y;
    let stride = tw * 4;

    // Header + 64 bytes per block
    let mut out = Vec::with_capacity(4 + num_blocks * 64);
    out.extend_from_slice(&(tex_w as u16).to_le_bytes());
    out.extend_from_slice(&(tex_h as u16).to_le_bytes());

    // Store nomask flag as extra byte after header
    out.push(if nomask { 1 } else { 0 });
    out.push(0); // padding
    out.push(0);
    out.push(0);

    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            for row in 0..4 {
                let src = ((by * 4 + row) * stride) + bx * 4 * 4;
                out.extend_from_slice(&padded[src..src + 16]);
            }
        }
    }

    out
}

// ── dxt5_compress_chunk ─────────────────────────────────────────────────────

/// Compress a chunk of DXT5 blocks in a WebWorker.
///
/// Input:  N × 64 bytes (4×4 RGBA pixels per block)
/// Output: N × 40 bytes `[dxt5_block:16,
///          alpha_mse:i32, alpha_ssim:f64, color_mse:i32, color_ssim:f64]`
#[wasm_bindgen]
pub fn dxt5_compress_chunk(chunk: &[u8], mask: bool) -> Vec<u8> {
    use dxt5::compress;
    use dxt5::types::*;

    let block_in = 64;
    let block_out = 40;
    let num_blocks = chunk.len() / block_in;

    let params = Params {
        algorithm: Algorithm::IterativeClusterFit,
        weights: COLOUR_WEIGHTS_PERCEPTUAL,
        weigh_colour_by_alpha: mask,
    };

    let mut out = Vec::with_capacity(num_blocks * block_out);

    for i in 0..num_blocks {
        let rgba_block = &chunk[i * block_in..(i + 1) * block_in];

        // Convert &[u8] to [[u8; 4]; 16]
        let mut pixels = [[0u8; 4]; 16];
        for p in 0..16 {
            pixels[p].copy_from_slice(&rgba_block[p * 4..p * 4 + 4]);
        }

        // Compress
        let mut compressed = [0u8; 16];
        compress::compress_block_masked(pixels, 0xFFFF, params, &mut compressed);

        // Decompress for metrics
        let decompressed = compress::decompress_block(&compressed);

        // Build original and decompressed as contiguous RGBA buffers for SSIM
        let mut dec_flat = [0u8; 64];
        for p in 0..16 {
            dec_flat[p * 4..p * 4 + 4].copy_from_slice(&decompressed[p]);
        }

        // Alpha MSE
        let mut alpha_mse: i32 = 0;
        for p in 0..16 {
            let d = rgba_block[p * 4 + 3] as i32 - dec_flat[p * 4 + 3] as i32;
            alpha_mse += d * d;
        }

        // Alpha SSIM (stride = 16 bytes = 4 pixels × 4 bytes)
        let alpha_ssim = quality::compare_blocks_alpha_ssim(rgba_block, 16, &dec_flat, 16);

        // Color MSE (weighted)
        let mut color_mse: i32 = 0;
        for p in 0..16 {
            let or = rgba_block[p * 4] as i32;
            let og = rgba_block[p * 4 + 1] as i32;
            let ob = rgba_block[p * 4 + 2] as i32;
            let dr = dec_flat[p * 4] as i32;
            let dg = dec_flat[p * 4 + 1] as i32;
            let db = dec_flat[p * 4 + 2] as i32;

            color_mse += (or - dr) * (or - dr) * crate::shared::types::K_RED
                + (og - dg) * (og - dg) * crate::shared::types::K_GREEN
                + (ob - db) * (ob - db) * crate::shared::types::K_BLUE;
        }

        // Color SSIM (weighted)
        let color_ssim = quality::compare_blocks_color_ssim(rgba_block, 16, &dec_flat, 16);

        // Serialize output (40 bytes)
        out.extend_from_slice(&compressed);                        // [0..16]
        out.extend_from_slice(&alpha_mse.to_le_bytes());           // [16..20]
        out.extend_from_slice(&alpha_ssim.to_le_bytes());          // [20..28]
        out.extend_from_slice(&color_mse.to_le_bytes());           // [28..32]
        out.extend_from_slice(&color_ssim.to_le_bytes());          // [32..40]
    }

    out
}

// ── tex_finalize (shared) ───────────────────────────────────────────────────

/// Assemble final output from worker results. Shared for both formats.
///
/// Input: concatenated worker outputs (num_blocks × 40), texture dims,
///        format (0=ETC2, 1=DXT5), debug flag.
/// Output: `[data_len:u32, data, metrics:4×f64, debug_rgba?]`
///
/// Compressed block layout:
///   ETC2: first 16 bytes = [alpha_etc2:8, color_etc2:8]
///   DXT5: first 16 bytes = [BC3 block:16]
#[wasm_bindgen]
pub fn tex_finalize(
    results: &[u8],
    tex_w: u16,
    tex_h: u16,
    format: u8,
    debug: bool,
) -> Vec<u8> {
    let tw = tex_w as usize;
    let th = tex_h as usize;
    let num_blocks = (tw / 4) * (th / 4);
    let data_size = tw * th; // 16 bytes per block for both formats
    let total_pixels = (tw * th) as f64;
    const K_COLOR_F: f64 = 1000.0;

    let mut data_buf = vec![0u8; data_size];
    let mut total_alpha_mse: i64 = 0;
    let mut total_alpha_ssim: f64 = 0.0;
    let mut total_color_mse: i64 = 0;
    let mut total_color_ssim: f64 = 0.0;

    let record_size = 40;
    for i in 0..num_blocks {
        let rec = &results[i * record_size..(i + 1) * record_size];

        // Copy compressed block (16 bytes)
        let block_off = i * 16;
        data_buf[block_off..block_off + 16].copy_from_slice(&rec[0..16]);

        // Aggregate metrics
        let alpha_mse = i32::from_le_bytes(rec[16..20].try_into().unwrap());
        let alpha_ssim = f64::from_le_bytes(rec[20..28].try_into().unwrap());
        let color_mse = i32::from_le_bytes(rec[28..32].try_into().unwrap());
        let color_ssim = f64::from_le_bytes(rec[32..40].try_into().unwrap());

        total_alpha_mse += alpha_mse as i64;
        total_alpha_ssim += alpha_ssim;
        total_color_mse += color_mse as i64;
        total_color_ssim += color_ssim;
    }

    // Compute PSNR / SSIM
    let alpha_psnr = if total_alpha_mse > 0 {
        10.0 * ((255.0 * 255.0 * total_pixels / total_alpha_mse as f64).ln() / 10_f64.ln())
    } else {
        f64::INFINITY
    };
    let alpha_ssim_norm = total_alpha_ssim * 16.0 / total_pixels;

    let color_wpsnr = if total_color_mse > 0 {
        10.0 * ((255.0 * 255.0 * K_COLOR_F * total_pixels / total_color_mse as f64).ln()
            / 10_f64.ln())
    } else {
        f64::INFINITY
    };
    let color_wssim = total_color_ssim * 16.0 / total_pixels;

    // Build output
    let data_len = data_buf.len() as u32;
    let debug_size = if debug { tw * th * 4 } else { 0 };
    let metrics_size = 4 * 8;

    let mut out = Vec::with_capacity(
        4 + data_buf.len() + metrics_size + if debug { 8 + debug_size } else { 0 },
    );

    // Compressed data (length-prefixed)
    out.extend_from_slice(&data_len.to_le_bytes());
    out.extend_from_slice(&data_buf);

    // Quality metrics
    out.extend_from_slice(&alpha_psnr.to_le_bytes());
    out.extend_from_slice(&alpha_ssim_norm.to_le_bytes());
    out.extend_from_slice(&color_wpsnr.to_le_bytes());
    out.extend_from_slice(&color_wssim.to_le_bytes());

    // Debug bitmap (RGBA for browser)
    if debug {
        let tw32 = tex_w as u32;
        let th32 = tex_h as u32;

        let debug_rgba = if format == 0 {
            // ETC2: decompress alpha + colour separately, merge
            let mut alpha_bgra = vec![0u8; tw * th * 4];
            etc2::decompress::decompress_alpha_texture(&data_buf, &mut alpha_bgra, tw32, th32);

            let mut color_bgra = vec![0u8; tw * th * 4];
            etc2::decompress::decompress_color_texture(&data_buf, &mut color_bgra, tw32, th32);

            // Merge: RGB from colour, A from alpha; then BGRA → RGBA
            for i in 0..tw * th {
                color_bgra[i * 4 + 3] = alpha_bgra[i * 4 + 3];
            }
            // BGRA → RGBA
            let mut rgba = Vec::with_capacity(tw * th * 4);
            for px in color_bgra.chunks_exact(4) {
                rgba.push(px[2]); // R
                rgba.push(px[1]); // G
                rgba.push(px[0]); // B
                rgba.push(px[3]); // A
            }
            rgba
        } else {
            // DXT5: single-pass decompress, already RGBA
            dxt5::Dxt5Engine::decompress_raw(&data_buf, tw, th)
        };

        out.extend_from_slice(&tw32.to_le_bytes());
        out.extend_from_slice(&th32.to_le_bytes());
        out.extend_from_slice(&debug_rgba);
    }

    out
}
