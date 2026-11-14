//! Scalar SSIM (Structural Similarity Index) accumulator.
//!
//! Mirrors the `SSIM_INIT` / `SSIM_UPDATE` / `SSIM_CLOSE` / `SSIM_OTHER` /
//! `SSIM_FINAL` macros in `Etc2Compress.cpp`, but operates on 4 independent
//! scalar channels instead of SSE4.1 SIMD lanes.
//!
//! # Channel mapping
//!
//! The C++ code packs pixels as BGRA via `_mm_cvtepu8_epi32`, so the 4 lanes
//! correspond to:
//!
//! | lane | channel |
//! |------|---------|
//! |  0   | Blue    |
//! |  1   | Green   |
//! |  2   | Red     |
//! |  3   | Alpha   |
//!
//! # Scalar fidelity notes
//!
//! `SSIM_UPDATE` uses `_mm_mullo_epi16` to accumulate products.  For pixel
//! values in `0..=255` the 16-bit product never overflows (`255² = 65025 <
//! 65536`), so scalar `i64` arithmetic produces bit-identical results.
//!
//! `SSIM_CLOSE` uses `_mm_mullo_epi32` for `sa × sb`.  Again, for 16-pixel
//! blocks `sa ≤ 16 × 255 = 4080`, so `sa × sb ≤ 16 646 400 < 2³¹` — no
//! overflow.

use crate::etc2::types::{G_SSIM_16K1L, G_SSIM_16K2L};

// ── Accumulator ───────────────────────────────────────────────────────────────

/// In-progress SSIM accumulator for 4 independent channels (BGRA lanes).
///
/// Call [`update`](Self::update) for every pixel pair, then [`close`](Self::close)
/// to obtain the [`SsimClose`] intermediate state.
#[derive(Default, Clone, Copy)]
pub struct SsimAccum {
    sa: [i64; 4],
    sb: [i64; 4],
    sab: [i64; 4],
    saa_sbb: [i64; 4],
}

impl SsimAccum {
    /// Create a zeroed accumulator (`SSIM_INIT`).
    #[inline(always)]
    pub fn new() -> Self {
        Self::default()
    }

    /// Accumulate one pixel pair per channel (`SSIM_UPDATE`).
    ///
    /// `a` and `b` are 4-channel pixel values `[B, G, R, A]` in `0..=255`.
    ///
    /// Matches the C++ macro exactly:
    /// ```text
    /// sa      += a
    /// sb      += b
    /// sab     += mullo_epi16(a, b)   // = a*b for 8-bit inputs
    /// saa_sbb += mullo_epi16(a,a) + mullo_epi16(b,b)
    /// ```
    #[inline(always)]
    pub fn update(&mut self, a: [i32; 4], b: [i32; 4]) {
        for i in 0..4 {
            let ai = a[i] as i64;
            let bi = b[i] as i64;
            self.sa[i] += ai;
            self.sb[i] += bi;
            // mullo_epi16: lower 16 bits of product — exact for values 0..=255
            self.sab[i] += ai * bi;
            self.saa_sbb[i] += ai * ai + bi * bi;
        }
    }

    /// Finalise moment computation (`SSIM_CLOSE`).
    ///
    /// `shift` matches the C++ macro parameter:
    /// - `4` for 16-pixel (4×4) blocks
    /// - `3` for  8-pixel (half) blocks
    pub fn close(self, shift: u32) -> SsimClose {
        let mut sab = self.sab;
        let mut saa_sbb = self.saa_sbb;
        let mut sasb = [0i64; 4];
        let mut sasa_sbsb = [0i64; 4];

        for i in 0..4 {
            // _mm_slli_epi32: shift left as i32 (wrap-around on overflow, but
            // values are within range — see module doc).
            sab[i] = ((sab[i] as i32) << (shift + 1)) as i64;
            saa_sbb[i] = ((saa_sbb[i] as i32) << shift) as i64;

            // _mm_mullo_epi32: lower 32 bits of i32 × i32 product.
            let sa_i32 = self.sa[i] as i32;
            let sb_i32 = self.sb[i] as i32;
            let raw_sasb = sa_i32.wrapping_mul(sb_i32);
            sasb[i] = (raw_sasb.wrapping_add(raw_sasb)) as i64; // ×2

            sasa_sbsb[i] = (sa_i32.wrapping_mul(sa_i32)
                .wrapping_add(sb_i32.wrapping_mul(sb_i32))) as i64;
        }

        for i in 0..4 {
            sab[i] = ((sab[i] as i32).wrapping_sub(sasb[i] as i32)) as i64;
            saa_sbb[i] =
                ((saa_sbb[i] as i32).wrapping_sub(sasa_sbsb[i] as i32)) as i64;
        }

        SsimClose { sab, saa_sbb, sasb, sasa_sbsb }
    }
}

// ── Finalised state ───────────────────────────────────────────────────────────

/// Intermediate SSIM state produced by [`SsimAccum::close`].
///
/// Call [`final_pair`](Self::final_pair) to extract per-channel SSIM ratios,
/// and [`other`](Self::other) to swap channel halves before a second
/// `final_pair` call (matching `SSIM_OTHER`).
pub struct SsimClose {
    pub sab: [i64; 4],
    pub saa_sbb: [i64; 4],
    pub sasb: [i64; 4],
    pub sasa_sbsb: [i64; 4],
}

impl SsimClose {
    /// Compute the SSIM ratio for two channels (`SSIM_FINAL`).
    ///
    /// Returns `[ssim_lo, ssim_hi]` for channels `lo` and `hi`.
    /// `k1` / `k2` are the SSIM stability constants (e.g. [`G_SSIM_16K1L`] /
    /// [`G_SSIM_16K2L`]).
    ///
    /// Mirrors: `dst = (sasb + k1)(sab + k2) / ((sasa_sbsb + k1)(saa_sbb + k2))`
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

    /// Swap the two channel halves (`SSIM_OTHER`).
    ///
    /// Brings lanes `[2, 3]` (Red, Alpha) into positions `[0, 1]` so a
    /// subsequent [`final_pair(0, 1, …)`](Self::final_pair) yields the Red /
    /// Alpha SSIM values.  Matches `_mm_unpackhi_epi64(x, x)`.
    pub fn other(self) -> Self {
        Self {
            sab: [self.sab[2], self.sab[3], self.sab[0], self.sab[1]],
            saa_sbb: [self.saa_sbb[2], self.saa_sbb[3], self.saa_sbb[0], self.saa_sbb[1]],
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

// ── Convenience wrapper ───────────────────────────────────────────────────────

/// Compute weighted-SSIM over a 4×4 BGRA block pair.
///
/// Mirrors `CompareBlocksColorSSIM()` (C++ lines 2418–2452).
///
/// Returns `SSIM_blue * kBlue + SSIM_green * kGreen + SSIM_red * kRed`,
/// normalised by `kColor`.  Pixels with `alpha == 0` in `cell1` are skipped.
pub fn compare_blocks_color_ssim(
    cell1: &[u8],
    stride1: usize,
    cell2: &[u8],
    stride2: usize,
) -> f64 {
    use crate::etc2::types::{K_BLUE, K_COLOR, K_GREEN, K_RED};

    let mut accum = SsimAccum::new();

    for y in 0..4 {
        for x in 0..4 {
            if cell1[y * stride1 + x * 4 + 3] != 0 {
                let a = pixel_bgra(cell2, y * stride2 + x * 4);
                let b = pixel_bgra(cell1, y * stride1 + x * 4);
                accum.update(a, b);
            }
        }
    }

    let closed = accum.close(4);

    // SSIM_FINAL for Blue (lane 0) and Green (lane 1).
    let [ssim_b, ssim_g] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);

    // SSIM_OTHER: bring Red (lane 2) and Alpha (lane 3) into lanes 0 and 1.
    let other = closed.other();
    let [ssim_r, _] = other.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);

    (ssim_b * K_BLUE as f64 + ssim_g * K_GREEN as f64 + ssim_r * K_RED as f64)
        / K_COLOR as f64
}

/// Compute SSIM over the alpha channel of a 4×4 BGRA block pair.
///
/// Mirrors `CompareBlocksAlphaSSIM()` (C++ lines 1740–1764).
/// Reads the alpha byte (`offset + 3`) for each pixel; `stride` is in bytes.
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

#[inline(always)]
fn pixel_bgra(buf: &[u8], off: usize) -> [i32; 4] {
    [
        buf[off] as i32,
        buf[off + 1] as i32,
        buf[off + 2] as i32,
        buf[off + 3] as i32,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Identical blocks must yield SSIM = 1.0 for every channel.
    #[test]
    fn identical_blocks_ssim_one() {
        let block: Vec<u8> = (0..4)
            .flat_map(|_| [100u8, 150, 200, 255].iter().copied().cycle().take(16))
            .collect();
        let ssim = compare_blocks_color_ssim(&block, 16, &block, 16);
        assert!((ssim - 1.0).abs() < 1e-9, "ssim = {ssim}");
    }

    /// All-zero alpha pixels are skipped; result should still be finite.
    #[test]
    fn all_transparent_block() {
        let block = vec![0u8; 64]; // 4×4 BGRA, all zero (alpha = 0)
        let ssim = compare_blocks_color_ssim(&block, 16, &block, 16);
        // With no samples the numerator / denominator are both pure constants.
        assert!(ssim.is_finite());
    }

    /// Accumulate 0-update and verify close() returns sensible values.
    #[test]
    fn empty_accum_close() {
        let accum = SsimAccum::new();
        let closed = accum.close(4);
        // With sa=sb=sab=saa_sbb=0 the only contribution is from the k constants.
        let [s, _] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        assert!(s.is_finite());
    }

    #[test]
    fn other_swaps_channels() {
        let mut accum = SsimAccum::new();
        // Blue=10, Green=20, Red=30, Alpha=40
        accum.update([10, 20, 30, 40], [10, 20, 30, 40]);
        let closed = accum.close(4);
        let [b, g] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        let other = closed.other();
        let [r, _a] = other.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        // Identical channels must all yield SSIM = 1.0.
        assert!((b - 1.0).abs() < 1e-9);
        assert!((g - 1.0).abs() < 1e-9);
        assert!((r - 1.0).abs() < 1e-9);
    }
}
