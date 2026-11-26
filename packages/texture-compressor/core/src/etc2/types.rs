//! Core data structures and constants mirroring Etc2Compress.cpp.
//!
//! # SIMD strategy (P0-simd-plan)
//!
//! The C++ source uses SSE4.1 (`__m128i`) in every hot path.  For this Rust
//! port we start with a **scalar representation**: `SimdI32x4 = [i32; 4]`.
//! This lets us get correct results first and validate them against the C++
//! reference before any SIMD work.  Phase 3 will replace `SimdI32x4` on hot
//! paths using `std::arch::x86_64` SSE4.1 intrinsics guarded by
//! `#[target_feature(enable = "sse4.1")]`.

// ── SIMD placeholder ─────────────────────────────────────────────────────────

/// Scalar stand-in for `__m128i` (128-bit SSE register as 4 × i32).
///
/// Each element corresponds to one 32-bit SIMD lane.  Replace with a real
/// SIMD type (e.g. `std::arch::x86_64::__m128i`) when porting Phase 3.
pub type SimdI32x4 = [i32; 4];

// ── Perceptual colour weights (sRGB) ─────────────────────────────────────────
// Source: http://www.brucelindbloom.com/index.html?WorkingSpaceInfo.html

pub const K_GREEN: i32 = 715;
pub const K_RED: i32 = 213;
pub const K_BLUE: i32 = 72;
/// Sum of channel weights (= 1000).
pub const K_COLOR: i32 = K_GREEN + K_RED + K_BLUE;

// ── ETC2 modifier / lookup tables ────────────────────────────────────────────

/// Individual/Differential modifier table: `G_TABLE[codeword][sign]`.
pub const G_TABLE: [[i32; 2]; 8] = [
    [2, 8],
    [5, 17],
    [9, 29],
    [13, 42],
    [18, 60],
    [24, 80],
    [33, 106],
    [47, 183],
];

/// T-mode and H-mode distance table: `G_TABLE_HT[codeword]`.
pub const G_TABLE_HT: [i32; 8] = [3, 6, 11, 16, 23, 32, 41, 64];

/// Alpha mode modifier table: `G_TABLE_A[multiplier][index]`.
pub const G_TABLE_A: [[i16; 8]; 16] = [
    [-3, -6, -9, -15, 2, 5, 8, 14],
    [-3, -7, -10, -13, 2, 6, 9, 12],
    [-2, -5, -8, -13, 1, 4, 7, 12],
    [-2, -4, -6, -13, 1, 3, 5, 12],
    [-3, -6, -8, -12, 2, 5, 7, 11],
    [-3, -7, -9, -11, 2, 6, 8, 10],
    [-4, -7, -8, -11, 3, 6, 7, 10],
    [-3, -5, -8, -11, 2, 4, 7, 10],
    [-2, -6, -8, -10, 1, 5, 7, 9],
    [-2, -5, -8, -10, 1, 4, 7, 9],
    [-2, -4, -8, -10, 1, 3, 7, 9],
    [-2, -5, -7, -10, 1, 4, 6, 9],
    [-3, -4, -7, -10, 2, 3, 6, 9],
    [-1, -2, -3, -10, 0, 1, 2, 9],
    [-4, -6, -8, -9, 3, 5, 7, 8],
    [-3, -5, -7, -9, 2, 4, 6, 8],
];

/// 4-bit quantised colour palette (Individual mode): `G_COLORS4[index]`.
pub const G_COLORS4: [i32; 0x10] = [
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
    0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF,
];

/// 5-bit quantised colour palette (Differential mode): `G_COLORS5[index]`.
pub const G_COLORS5: [i32; 0x20] = [
    0x00, 0x08, 0x10, 0x18, 0x21, 0x29, 0x31, 0x39,
    0x42, 0x4A, 0x52, 0x5A, 0x63, 0x6B, 0x73, 0x7B,
    0x84, 0x8C, 0x94, 0x9C, 0xA5, 0xAD, 0xB5, 0xBD,
    0xC6, 0xCE, 0xD6, 0xDE, 0xE7, 0xEF, 0xF7, 0xFF,
];

// ── SSIM constants ────────────────────────────────────────────────────────────

pub const G_SSIM_8K1L: f64 = (0.01 * 255.0 * 8.0) * (0.01 * 255.0 * 8.0);
pub const G_SSIM_8K2L: f64 = G_SSIM_8K1L * 9.0;
pub const G_SSIM_16K1L: f64 = (0.01 * 255.0 * 16.0) * (0.01 * 255.0 * 16.0);
pub const G_SSIM_16K2L: f64 = G_SSIM_16K1L * 9.0;

// ── Core data structures ──────────────────────────────────────────────────────

/// 8-pixel half-block (top or bottom half of a 4×4 ETC block).
///
/// Pixel data is stored as `[G, R, B, 0]` per pixel, matching the C++ GRB
/// channel ordering used throughout the compressor.
///
/// The `data_grb / data_gr / data_gb` fields are derived SIMD data produced
/// by [`derive_data`].  In scalar mode they are unused; populate them before
/// calling any Phase-3+ SIMD error functions.
#[repr(C, align(16))]
pub struct Half {
    /// Raw pixel data: `[G, R, B, 0]` for each of 8 pixels (32 i32 values).
    pub data: [i32; 8 * 4],
    /// GRB packed as u16 pairs for SIMD (2 pixels per `SimdI32x4`).
    pub data_grb: [SimdI32x4; 8],
    pub data_gr: [SimdI32x4; 8],
    pub data_gb: [SimdI32x4; 8],
    pub count: i32,
    pub color: [u8; 4],
    pub shift: [u8; 8],
}

impl Default for Half {
    fn default() -> Self {
        // SAFETY: all-zero bytes are a valid bit pattern for this plain-data struct.
        unsafe { std::mem::zeroed() }
    }
}

/// Two half-blocks (A = top, B = bottom) forming a complete 4×4 ETC block.
#[repr(C, align(16))]
pub struct Elem {
    pub a: Half,
    pub b: Half,
}

impl Default for Elem {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

/// 16-pixel area (full 4×4 block) with derived SIMD data.
#[repr(C, align(16))]
pub struct Area {
    /// Raw pixel data: `[G, R, B, 0]` for each of 16 pixels (64 i32 values).
    pub data: [i32; 16 * 4],
    pub data_grb: [SimdI32x4; 16],
    pub data_gr: [SimdI32x4; 16],
    pub data_gb: [SimdI32x4; 16],
    pub shift: [u8; 16],
    pub count: i32,
    _unused: [i32; 3],
}

impl Default for Area {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

/// Error–colour pair used as a candidate during compression search.
///
/// Sorted ascending by `error`; lower error = better candidate.
#[repr(C, align(8))]
#[derive(Clone, Copy, Default, PartialEq, Eq, Debug)]
pub struct Node {
    pub error: i32,
    pub color: i32,
}

impl Node {
    #[inline]
    pub const fn new(error: i32, color: i32) -> Self {
        Self { error, color }
    }

    /// Sentinel with maximum possible error (used to initialise candidate arrays).
    pub const WORST: Self = Self { error: i32::MAX, color: 0 };
}

impl PartialOrd for Node {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Node {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.error.cmp(&other.error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_ordering() {
        let a = Node::new(10, 0xFF);
        let b = Node::new(20, 0x00);
        assert!(a < b);
        assert_eq!(Node::WORST.error, i32::MAX);
    }

    #[test]
    fn constants_match_cpp() {
        // Weights must sum to 1000.
        assert_eq!(K_GREEN + K_RED + K_BLUE, 1000);
        assert_eq!(K_COLOR, 1000);

        // G_TABLE_A row 0 matches C++ source.
        assert_eq!(G_TABLE_A[0], [-3, -6, -9, -15, 2, 5, 8, 14]);

        // G_COLORS4 endpoints.
        assert_eq!(G_COLORS4[0], 0x00);
        assert_eq!(G_COLORS4[0xF], 0xFF);

        // G_COLORS5 endpoints.
        assert_eq!(G_COLORS5[0], 0x00);
        assert_eq!(G_COLORS5[0x1F], 0xFF);
    }
}
