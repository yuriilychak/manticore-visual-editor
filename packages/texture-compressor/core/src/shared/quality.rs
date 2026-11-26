//! Quality metrics: PSNR and SSIM for RGBA images.
//!
//! SSIM accumulator ported from etc2compress-rs/src/ssim.rs. The original code
//! uses BGRA channel order; this version uses RGBA:
//!
//! | lane | channel |
//! |------|---------|
//! |  0   | Red     |
//! |  1   | Green   |
//! |  2   | Blue    |
//! |  3   | Alpha   |

use crate::shared::types::{K_BLUE, K_COLOR, K_GREEN, K_RED};

// SSIM stability constants for 16-pixel (4×4) blocks.
const G_SSIM_16K1L: f64 = (0.01 * 255.0 * 16.0) * (0.01 * 255.0 * 16.0);
const G_SSIM_16K2L: f64 = G_SSIM_16K1L * 9.0;

// ── SSIM Accumulator ──────────────────────────────────────────────────────────

/// In-progress SSIM accumulator for 4 independent channels (RGBA lanes).
#[derive(Default, Clone, Copy)]
pub struct SsimAccum {
    sa: [i64; 4],
    sb: [i64; 4],
    sab: [i64; 4],
    saa_sbb: [i64; 4],
}

impl SsimAccum {
    #[inline(always)]
    pub fn new() -> Self {
        Self::default()
    }

    /// Accumulate one pixel pair per channel.
    /// `a` and `b` are 4-channel pixel values [R, G, B, A] in 0..=255.
    #[inline(always)]
    pub fn update(&mut self, a: [i32; 4], b: [i32; 4]) {
        for i in 0..4 {
            let ai = a[i] as i64;
            let bi = b[i] as i64;
            self.sa[i] += ai;
            self.sb[i] += bi;
            self.sab[i] += ai * bi;
            self.saa_sbb[i] += ai * ai + bi * bi;
        }
    }

    /// Finalise moment computation.
    /// `shift` = 4 for 16-pixel (4×4) blocks.
    pub fn close(self, shift: u32) -> SsimClose {
        let mut sab = self.sab;
        let mut saa_sbb = self.saa_sbb;
        let mut sasb = [0i64; 4];
        let mut sasa_sbsb = [0i64; 4];

        for i in 0..4 {
            sab[i] = ((sab[i] as i32) << (shift + 1)) as i64;
            saa_sbb[i] = ((saa_sbb[i] as i32) << shift) as i64;

            let sa_i32 = self.sa[i] as i32;
            let sb_i32 = self.sb[i] as i32;
            let raw_sasb = sa_i32.wrapping_mul(sb_i32);
            sasb[i] = (raw_sasb.wrapping_add(raw_sasb)) as i64;

            sasa_sbsb[i] = (sa_i32
                .wrapping_mul(sa_i32)
                .wrapping_add(sb_i32.wrapping_mul(sb_i32)))
                as i64;
        }

        for i in 0..4 {
            sab[i] = ((sab[i] as i32).wrapping_sub(sasb[i] as i32)) as i64;
            saa_sbb[i] = ((saa_sbb[i] as i32).wrapping_sub(sasa_sbsb[i] as i32)) as i64;
        }

        SsimClose {
            sab,
            saa_sbb,
            sasb,
            sasa_sbsb,
        }
    }
}

/// Intermediate SSIM state produced by [`SsimAccum::close`].
pub struct SsimClose {
    pub sab: [i64; 4],
    pub saa_sbb: [i64; 4],
    pub sasb: [i64; 4],
    pub sasa_sbsb: [i64; 4],
}

impl SsimClose {
    /// Compute SSIM for two channels. Returns `[ssim_lo, ssim_hi]`.
    pub fn final_pair(&self, lo: usize, hi: usize, k1: f64, k2: f64) -> [f64; 2] {
        [self.channel_ssim(lo, k1, k2), self.channel_ssim(hi, k1, k2)]
    }

    fn channel_ssim(&self, ch: usize, k1: f64, k2: f64) -> f64 {
        let sasb = self.sasb[ch] as f64;
        let sab = self.sab[ch] as f64;
        let sasa_sbsb = self.sasa_sbsb[ch] as f64;
        let saa_sbb = self.saa_sbb[ch] as f64;
        ((sasb + k1) * (sab + k2)) / ((sasa_sbsb + k1) * (saa_sbb + k2))
    }

    /// Swap channel halves: bring [2,3] (Blue,Alpha) into [0,1].
    pub fn other(self) -> Self {
        Self {
            sab: [self.sab[2], self.sab[3], self.sab[0], self.sab[1]],
            saa_sbb: [
                self.saa_sbb[2],
                self.saa_sbb[3],
                self.saa_sbb[0],
                self.saa_sbb[1],
            ],
            sasb: [self.sasb[2], self.sasb[3], self.sasb[0], self.sasb[1]],
            sasa_sbsb: [
                self.sasa_sbsb[2],
                self.sasa_sbsb[3],
                self.sasa_sbsb[0],
                self.sasa_sbsb[1],
            ],
        }
    }
}

// ── Block-level SSIM ──────────────────────────────────────────────────────────

#[inline(always)]
fn pixel_rgba(buf: &[u8], off: usize) -> [i32; 4] {
    [
        buf[off] as i32,
        buf[off + 1] as i32,
        buf[off + 2] as i32,
        buf[off + 3] as i32,
    ]
}

/// Weighted colour SSIM over a 4×4 RGBA block pair.
/// Returns `(SSIM_r * kRed + SSIM_g * kGreen + SSIM_b * kBlue) / kColor`.
/// Pixels with alpha == 0 in `cell1` are skipped.
pub fn compare_blocks_color_ssim(
    cell1: &[u8],
    stride1: usize,
    cell2: &[u8],
    stride2: usize,
) -> f64 {
    let mut accum = SsimAccum::new();

    for y in 0..4 {
        for x in 0..4 {
            if cell1[y * stride1 + x * 4 + 3] != 0 {
                let a = pixel_rgba(cell2, y * stride2 + x * 4);
                let b = pixel_rgba(cell1, y * stride1 + x * 4);
                accum.update(a, b);
            }
        }
    }

    let closed = accum.close(4);

    // RGBA layout: lane 0 = Red, lane 1 = Green
    let [ssim_r, ssim_g] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);

    // Swap to get lane 2 = Blue, lane 3 = Alpha
    let other = closed.other();
    let [ssim_b, _] = other.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);

    (ssim_r * K_RED as f64 + ssim_g * K_GREEN as f64 + ssim_b * K_BLUE as f64) / K_COLOR as f64
}

/// SSIM over the alpha channel of a 4×4 RGBA block pair.
pub fn compare_blocks_alpha_ssim(
    cell1: &[u8],
    stride1: usize,
    cell2: &[u8],
    stride2: usize,
) -> f64 {
    let mut accum = SsimAccum::new();

    for y in 0..4 {
        for x in 0..4 {
            let a = [cell2[y * stride2 + x * 4 + 3] as i32, 0, 0, 0];
            let b = [cell1[y * stride1 + x * 4 + 3] as i32, 0, 0, 0];
            accum.update(a, b);
        }
    }

    let closed = accum.close(4);
    closed.final_pair(0, 0, G_SSIM_16K1L, G_SSIM_16K2L)[0]
}

// ── Image-level metrics ───────────────────────────────────────────────────────

/// Compute alpha MSE over the entire image.
pub fn compute_alpha_mse(original: &[u8], decompressed: &[u8], n_pixels: usize) -> i64 {
    (0..n_pixels)
        .map(|i| {
            let d = original[i * 4 + 3] as i64 - decompressed[i * 4 + 3] as i64;
            d * d
        })
        .sum()
}

/// Compute weighted colour MSE over the entire image.
/// Only pixels where the original has alpha != 0 are counted.
/// Returns the weighted MSE sum: sum(kR*dR² + kG*dG² + kB*dB²).
pub fn compute_color_mse(original: &[u8], decompressed: &[u8], n_pixels: usize) -> i64 {
    (0..n_pixels)
        .map(|i| {
            if original[i * 4 + 3] == 0 {
                return 0i64;
            }
            let off = i * 4;
            let dr = original[off] as i64 - decompressed[off] as i64;
            let dg = original[off + 1] as i64 - decompressed[off + 1] as i64;
            let db = original[off + 2] as i64 - decompressed[off + 2] as i64;
            dr * dr * K_RED as i64 + dg * dg * K_GREEN as i64 + db * db * K_BLUE as i64
        })
        .sum()
}

/// Compute alpha SSIM summed over all 4×4 blocks.
pub fn compute_alpha_ssim(original: &[u8], decompressed: &[u8], tex_w: u32, tex_h: u32) -> f64 {
    let blocks_x = tex_w as usize / 4;
    let blocks_y = tex_h as usize / 4;
    let stride = tex_w as usize * 4;
    let mut sum = 0.0f64;
    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            let off = (by * 4 * tex_w as usize + bx * 4) * 4;
            sum += compare_blocks_alpha_ssim(&original[off..], stride, &decompressed[off..], stride);
        }
    }
    sum
}

/// Compute weighted colour SSIM summed over all 4×4 blocks.
pub fn compute_color_ssim(original: &[u8], decompressed: &[u8], tex_w: u32, tex_h: u32) -> f64 {
    let blocks_x = tex_w as usize / 4;
    let blocks_y = tex_h as usize / 4;
    let stride = tex_w as usize * 4;
    let mut sum = 0.0f64;
    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            let off = (by * 4 * tex_w as usize + bx * 4) * 4;
            sum +=
                compare_blocks_color_ssim(&original[off..], stride, &decompressed[off..], stride);
        }
    }
    sum
}

/// Compute alpha PSNR from MSE. Returns `None` if MSE is 0 (exact match).
pub fn alpha_psnr(mse: i64, total_pixels: f64) -> Option<f64> {
    if mse > 0 {
        Some(10.0 * ((255.0 * 255.0 * total_pixels / mse as f64).ln() / 10_f64.ln()))
    } else {
        None
    }
}

/// Compute weighted colour PSNR from MSE. Returns `None` if MSE is 0.
pub fn color_wpsnr(mse: i64, total_pixels: f64) -> Option<f64> {
    if mse > 0 {
        Some(
            10.0 * ((255.0 * 255.0 * K_COLOR as f64 * total_pixels / mse as f64).ln()
                / 10_f64.ln()),
        )
    } else {
        None
    }
}

/// Normalise a raw SSIM block sum to the 0..1 range.
/// `raw_sum` is the sum of per-block SSIM values, `total_pixels` is tex_w × tex_h.
pub fn normalise_ssim(raw_sum: f64, total_pixels: f64) -> f64 {
    raw_sum * 16.0 / total_pixels
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_blocks_ssim_one() {
        // 4×4 block with varied RGBA values
        let block: Vec<u8> = (0..4)
            .flat_map(|_| [200u8, 150, 100, 255].iter().copied().cycle().take(16))
            .collect();
        let ssim = compare_blocks_color_ssim(&block, 16, &block, 16);
        assert!((ssim - 1.0).abs() < 1e-9, "ssim = {ssim}");
    }

    #[test]
    fn identical_blocks_alpha_ssim_one() {
        let block: Vec<u8> = (0..4)
            .flat_map(|_| [0u8, 0, 0, 200].iter().copied().cycle().take(16))
            .collect();
        let ssim = compare_blocks_alpha_ssim(&block, 16, &block, 16);
        assert!((ssim - 1.0).abs() < 1e-9, "ssim = {ssim}");
    }

    #[test]
    fn all_transparent_block() {
        let block = vec![0u8; 64];
        let ssim = compare_blocks_color_ssim(&block, 16, &block, 16);
        assert!(ssim.is_finite());
    }

    #[test]
    fn empty_accum_close() {
        let accum = SsimAccum::new();
        let closed = accum.close(4);
        let [s, _] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        assert!(s.is_finite());
    }

    #[test]
    fn other_swaps_channels() {
        let mut accum = SsimAccum::new();
        accum.update([10, 20, 30, 40], [10, 20, 30, 40]);
        let closed = accum.close(4);
        let [r, g] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        let other = closed.other();
        let [b, _a] = other.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        assert!((r - 1.0).abs() < 1e-9);
        assert!((g - 1.0).abs() < 1e-9);
        assert!((b - 1.0).abs() < 1e-9);
    }

    #[test]
    fn identical_image_zero_mse() {
        let img = vec![128u8; 64]; // 4×4 RGBA
        assert_eq!(compute_alpha_mse(&img, &img, 16), 0);
        assert_eq!(compute_color_mse(&img, &img, 16), 0);
    }

    #[test]
    fn known_alpha_mse() {
        let mut a = vec![0u8; 8]; // 2 pixels RGBA
        let mut b = vec![0u8; 8];
        a[3] = 100;
        b[3] = 110; // diff = 10, mse = 100
        a[7] = 200;
        b[7] = 200; // diff = 0
        assert_eq!(compute_alpha_mse(&a, &b, 2), 100);
    }

    #[test]
    fn psnr_exact_returns_none() {
        assert!(alpha_psnr(0, 1000.0).is_none());
        assert!(color_wpsnr(0, 1000.0).is_none());
    }

    #[test]
    fn psnr_positive_mse_returns_some() {
        let p = alpha_psnr(100, 16.0).unwrap();
        assert!(p > 0.0 && p < 100.0);
    }
}
