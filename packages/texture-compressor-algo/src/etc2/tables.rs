//! Lookup table initialisation — Rust port of `InitLevelErrors()`.
//!
//! The C++ compressor pre-computes several large error tables used by every
//! compression mode.  This module mirrors those tables exactly (same layout,
//! same values) so all compression modes can reference them directly.
//!
//! # Memory layout
//!
//! | Table | Shape | Size | Used by |
//! |-------|-------|------|---------|
//! | `errors4` | `[q:8][x:256][color:16]` i32 | 128 KiB | Individual (4-bit) |
//! | `errors5` | `[q:8][x:256][color:32]` i32 | 256 KiB | Differential (5-bit) |
//! | `errors4_u16` | `[q:8][x:256][color:16]` u16 | 64 KiB | Individual (packed) |
//! | `errors5_u16` | `[q:8][x:256][color:32]` u16 | 128 KiB | Differential (packed) |
//! | `errors_h_u16` | `[q:8][x:256][pair:256]` u16 | 1 MiB | H-mode |
//! | `errors_t_u16` | `[q:8][x:256][pair:256]` u16 | 1 MiB | T-mode |
//! | `errors_a_u16` | `[alpha:256][x:256][q:256]` u16 | 32 MiB | Alpha |
//! | `stripes_h_u16` | `[q:8][x:256][z:16]` u16 | 64 KiB | H-mode stripes |
//! | `stripes_t_u16` | `[q:8][x:256][z:16]` u16 | 64 KiB | T-mode stripes |
//! | `stripes_a_u16` | `[alpha:256][x:256][scale:16]` u16 | 2 MiB | Alpha stripes |
//!
//! # Initialisation
//!
//! Call [`Tables::init`] once at program start.  After that, access the
//! singleton via [`Tables::global`].

use std::sync::OnceLock;

use crate::etc2::types::{G_TABLE, G_TABLE_HT, G_TABLE_A, G_COLORS4, G_COLORS5};
use crate::etc2::utils::expand_color4;

// ── Global singleton ──────────────────────────────────────────────────────────

static TABLES: OnceLock<Box<Tables>> = OnceLock::new();

// ── Helper: heap-allocate zeroed T ───────────────────────────────────────────

/// Allocate a zeroed `T` directly on the heap, bypassing the stack.
///
/// Using `Box::new(val)` for large types first constructs the value on the
/// stack which can cause a stack overflow.  This helper uses the allocator
/// directly to avoid that.
///
/// # Safety
/// All-zero bytes must be a valid bit pattern for `T` (true for integer
/// types and arrays thereof).
unsafe fn alloc_zeroed_box<T>() -> Box<T> {
    let layout = std::alloc::Layout::new::<T>();
    let ptr = unsafe { std::alloc::alloc_zeroed(layout) } as *mut T;
    if ptr.is_null() {
        std::alloc::handle_alloc_error(layout);
    }
    unsafe { Box::from_raw(ptr) }
}

/// Allocate a zeroed `Box<[T]>` of `len` elements directly on the heap.
///
/// Avoids the glibc malloc fragmentation that `vec![0; len]` suffers from
/// on large allocations (78K+ brk syscalls for 32 MiB).
///
/// # Safety
/// All-zero bytes must be a valid bit pattern for `T`.
unsafe fn alloc_zeroed_slice<T>(len: usize) -> Box<[T]> {
    let layout = std::alloc::Layout::array::<T>(len).expect("layout overflow");
    let ptr = unsafe { std::alloc::alloc_zeroed(layout) } as *mut T;
    if ptr.is_null() {
        std::alloc::handle_alloc_error(layout);
    }
    let slice = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    unsafe { Box::from_raw(slice) }
}

// ── Tables struct ─────────────────────────────────────────────────────────────

/// All pre-computed error lookup tables needed by the ETC2 compressor.
pub struct Tables {
    /// `errors4[q][x][i]` = squared error for codeword table `q`, target
    /// pixel value `x`, and 4-bit base colour index `i`.
    pub errors4: Box<[[[i32; 16]; 256]; 8]>,

    /// Like `errors4` but for 5-bit (Differential) base colours.
    pub errors5: Box<[[[i32; 32]; 256]; 8]>,

    /// `u16`-truncated view of `errors4` (values ≤ 255² = 65 025, no loss).
    pub errors4_u16: Box<[[[u16; 16]; 256]; 8]>,

    /// `u16`-truncated view of `errors5`.
    pub errors5_u16: Box<[[[u16; 32]; 256]; 8]>,

    /// H-mode error table.
    /// `errors_h_u16[q][x][i]` = min squared distance from pixel `x` to
    /// the H-mode palette derived from pair index `i` and distance `q`.
    pub errors_h_u16: Box<[[[u16; 256]; 256]; 8]>,

    /// T-mode error table (same layout as H).
    pub errors_t_u16: Box<[[[u16; 256]; 256]; 8]>,

    /// Alpha error table.  Indexed as `[alpha * 65536 + x * 256 + q]`.
    /// `q = 0..15` are unused (left as 0); `q = 16..255` are filled.
    /// `q` encodes both scale (`q >> 4`) and table-row index (`q & 0xF`).
    pub errors_a_u16: Box<[u16]>,

    /// H-mode stripe table.
    /// `stripes_h_u16[q][x][z]` = min over the 16-pair sub-group `z` of
    /// `errors_h_u16[q][x][z*16..(z+1)*16]`.
    pub stripes_h_u16: Box<[[[u16; 16]; 256]; 8]>,

    /// T-mode stripe table (same layout as H stripes).
    pub stripes_t_u16: Box<[[[u16; 16]; 256]; 8]>,

    /// Alpha stripe table.  Indexed as `[alpha * 4096 + x * 16 + scale]`.
    /// `scale = 0` is unused; `scale = 1..15` are filled.
    pub stripes_a_u16: Box<[u16]>,
}

// ── Accessor helpers ──────────────────────────────────────────────────────────

impl Tables {
    /// `errors_a_u16[alpha][x][q]`
    #[inline(always)]
    pub fn errors_a(&self, alpha: usize, x: usize, q: usize) -> u16 {
        self.errors_a_u16[alpha * 256 * 256 + x * 256 + q]
    }

    /// Mutable `errors_a_u16[alpha][x][q]`
    #[inline(always)]
    fn errors_a_mut(&mut self, alpha: usize, x: usize, q: usize) -> &mut u16 {
        &mut self.errors_a_u16[alpha * 256 * 256 + x * 256 + q]
    }

    /// `stripes_a_u16[alpha][x][scale]`
    #[cfg(test)]
    #[inline(always)]
    fn stripes_a(&self, alpha: usize, x: usize, scale: usize) -> u16 {
        self.stripes_a_u16[alpha * 256 * 16 + x * 16 + scale]
    }

    /// Mutable `stripes_a_u16[alpha][x][scale]`
    #[inline(always)]
    fn stripes_a_mut(&mut self, alpha: usize, x: usize, scale: usize) -> &mut u16 {
        &mut self.stripes_a_u16[alpha * 256 * 16 + x * 16 + scale]
    }
}

// ── Initialisation ────────────────────────────────────────────────────────────

impl Tables {
    /// Compute and return all lookup tables.  Mirrors `InitLevelErrors()`.
    pub fn compute() -> Box<Self> {
        // SAFETY: all fields are integer arrays; all-zero is a valid
        // initial state and every entry will be written before being read.
        let mut t = unsafe {
            Box::new(Tables {
                errors4: alloc_zeroed_box(),
                errors5: alloc_zeroed_box(),
                errors4_u16: alloc_zeroed_box(),
                errors5_u16: alloc_zeroed_box(),
                errors_h_u16: alloc_zeroed_box(),
                errors_t_u16: alloc_zeroed_box(),
                errors_a_u16: alloc_zeroed_slice(256 * 256 * 256),
                stripes_h_u16: alloc_zeroed_box(),
                stripes_t_u16: alloc_zeroed_box(),
                stripes_a_u16: alloc_zeroed_slice(256 * 256 * 16),
            })
        };

        t.fill_errors4_errors5();
        t.fill_errors_h_t();
        t.fill_stripes_h_t();
        t.fill_errors4_errors5_u16();
        t.fill_errors_alpha();
        t.fill_stripes_alpha();

        t
    }

    /// Initialise the global singleton (idempotent).
    pub fn init() {
        TABLES.get_or_init(|| Tables::compute());
    }

    /// Return a reference to the global tables.
    ///
    /// # Panics
    /// Panics if [`Tables::init`] has not been called yet.
    pub fn global() -> &'static Tables {
        TABLES.get().expect("Tables::init() must be called first")
    }

    // ── Phase 1a / 1b: 4-bit and 5-bit quantisation errors ───────────────────

    fn fill_errors4_errors5(&mut self) {
        for q in 0..8usize {
            let q0 = G_TABLE[q][0];
            let q1 = G_TABLE[q][1];

            // 4-bit colours (Individual mode) — 16 base colours
            for i in 0..16usize {
                let c = G_COLORS4[i];
                let t0 = (c + q0).min(255);
                let t1 = (c + q1).min(255);
                let t2 = (c - q0).max(0);
                let t3 = (c - q1).max(0);

                for x in 0..256usize {
                    let xi = x as i32;
                    let v = (xi - t0).abs()
                        .min((xi - t1).abs())
                        .min((xi - t2).abs())
                        .min((xi - t3).abs());
                    self.errors4[q][x][i] = v * v;
                }
            }

            // 5-bit colours (Differential mode) — 32 base colours
            for i in 0..32usize {
                let c = G_COLORS5[i];
                let t0 = (c + q0).min(255);
                let t1 = (c + q1).min(255);
                let t2 = (c - q0).max(0);
                let t3 = (c - q1).max(0);

                for x in 0..256usize {
                    let xi = x as i32;
                    let v = (xi - t0).abs()
                        .min((xi - t1).abs())
                        .min((xi - t2).abs())
                        .min((xi - t3).abs());
                    self.errors5[q][x][i] = v * v;
                }
            }
        }
    }

    // ── Phase 1c-H/T: H-mode and T-mode per-pair error tables ────────────────
    //
    // The C++ pair index `i` encodes two 4-bit values (a, b):
    //   a = ((i >> 4) & 0xC) + ((i >> 2) & 3)
    //   b = ((i >> 2) & 0xC) + (i & 3)
    // which are then expanded from 4-bit to 8-bit via ExpandColor4.

    fn fill_errors_h_t(&mut self) {
        for q in 0..8usize {
            let d = G_TABLE_HT[q];

            for i in 0..256usize {
                let a = ((i >> 4) & 0xC) + ((i >> 2) & 3);
                let b = ((i >> 2) & 0xC) + (i & 3);

                let ca = expand_color4(a as i32);
                let cb = expand_color4(b as i32);

                // H-mode: palette = {ca+d, ca-d, cb+d, cb-d}
                let h0 = (ca + d).min(255);
                let h1 = (ca - d).max(0);
                let h2 = (cb + d).min(255);
                let h3 = (cb - d).max(0);

                // T-mode: palette = {ca, cb+d, cb, cb-d}
                let t0 = ca;
                let t1 = (cb + d).min(255);
                let t2 = cb;
                let t3 = (cb - d).max(0);

                for x in 0..256usize {
                    let xi = x as i32;

                    let vh = (xi - h0).abs()
                        .min((xi - h1).abs())
                        .min((xi - h2).abs())
                        .min((xi - h3).abs());
                    self.errors_h_u16[q][x][i] = (vh * vh) as u16;

                    let vt = (xi - t0).abs()
                        .min((xi - t1).abs())
                        .min((xi - t2).abs())
                        .min((xi - t3).abs());
                    self.errors_t_u16[q][x][i] = (vt * vt) as u16;
                }
            }
        }
    }

    // ── Phase 1c stripes: H/T stripe tables ──────────────────────────────────
    //
    // `stripes_h/t_u16[q][x][z]` = min of the 16-entry sub-group z in
    // `errors_h/t_u16[q][x]`.  The 256 pair indices are grouped as
    // z = 0..15, each covering 16 consecutive pair indices.

    fn fill_stripes_h_t(&mut self) {
        for q in 0..8usize {
            for x in 0..256usize {
                for z in 0..16usize {
                    let base = z * 16;
                    let min_h = (0..16)
                        .map(|j| self.errors_h_u16[q][x][base + j])
                        .min()
                        .unwrap();
                    let min_t = (0..16)
                        .map(|j| self.errors_t_u16[q][x][base + j])
                        .min()
                        .unwrap();
                    self.stripes_h_u16[q][x][z] = min_h;
                    self.stripes_t_u16[q][x][z] = min_t;
                }
            }
        }
    }

    // ── Phase 1d: u16 copies of errors4 / errors5 ────────────────────────────

    fn fill_errors4_errors5_u16(&mut self) {
        for q in 0..8 {
            for x in 0..256 {
                for i in 0..16 {
                    self.errors4_u16[q][x][i] = self.errors4[q][x][i] as u16;
                }
                for i in 0..32 {
                    self.errors5_u16[q][x][i] = self.errors5[q][x][i] as u16;
                }
            }
        }
    }

    // ── Phase 1c-Alpha: alpha error table ────────────────────────────────────
    //
    // For each combined index q (16..255):
    //   scale     = q >> 4          (1..15)
    //   table_row = q & 0xF         (0..15)
    //   mt[j]     = clamp(alpha + G_TABLE_A[table_row][j] * scale, 0, 255)
    //   error     = min_j (x - mt[j])²
    //
    // Mirrors the SSE4.1 loop that uses _mm_minpos_epu16.

    fn fill_errors_alpha(&mut self) {
        for q in 0x10..0x100usize {
            let scale = (q >> 4) as i16;
            let tbl = G_TABLE_A[q & 0x0F];

            // Pre-compute scaled table row (8 entries).
            let scaled: [i16; 8] = std::array::from_fn(|j| tbl[j] * scale);

            for alpha in 0..256usize {
                let a = alpha as i16;

                // mt[j] = saturating clamp of (alpha + scaled[j]) to 0..=255.
                let mt: [i16; 8] = std::array::from_fn(|j| (a + scaled[j]).clamp(0, 255));

                for x in 0..256usize {
                    let xv = x as i32;
                    let min_err = mt
                        .iter()
                        .map(|&tv| {
                            let d = xv - tv as i32;
                            (d * d) as u16
                        })
                        .min()
                        .unwrap();
                    *self.errors_a_mut(alpha, x, q) = min_err;
                }
            }
        }
    }

    // ── Phase 1c-Alpha stripes: alpha stripe table ────────────────────────────
    //
    // `stripes_a[alpha][x][scale]` = min over all 16 table-row choices of
    // `errors_a[alpha][x][scale * 16 .. scale * 16 + 16]`.
    // scale = 0 is skipped (q = 0..15 are unused).

    fn fill_stripes_alpha(&mut self) {
        for alpha in 0..256usize {
            for x in 0..256usize {
                for scale in 1..16usize {
                    let base_q = scale * 16;
                    let min_err = (0..16)
                        .map(|i| self.errors_a(alpha, x, base_q + i))
                        .min()
                        .unwrap();
                    *self.stripes_a_mut(alpha, x, scale) = min_err;
                }
            }
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn get() -> &'static Tables {
        Tables::init();
        Tables::global()
    }

    #[test]
    fn errors4_spot_check() {
        let t = get();
        // q=0: q0=2, q1=8; i=0: c=0x00=0; t0=2, t1=8, t2=0, t3=0.
        // x=5: dists = |5-2|=3, |5-8|=3, |5-0|=5, |5-0|=5 → min=3 → 9.
        assert_eq!(t.errors4[0][5][0], 9);
        // x=0, i=0: all targets 0 or above → min dist=0 → error=0.
        assert_eq!(t.errors4[0][0][0], 0);
    }

    #[test]
    fn errors5_spot_check() {
        let t = get();
        // q=0: q0=2, q1=8; i=0: c=0x00=0; same as errors4 for x=5.
        assert_eq!(t.errors5[0][5][0], 9);
    }

    #[test]
    fn errors4_u16_matches_errors4() {
        let t = get();
        for q in 0..8 {
            for x in 0..256 {
                for i in 0..16 {
                    assert_eq!(
                        t.errors4_u16[q][x][i],
                        t.errors4[q][x][i] as u16,
                        "q={q} x={x} i={i}"
                    );
                }
            }
        }
    }

    #[test]
    fn errors_h_t_basic() {
        let t = get();
        // q=0, d=3; i=0: a=0, b=0; ca=cb=0.
        // H: t0=3, t1=0, t2=3, t3=0; T: t0=0, t1=3, t2=0, t3=0.
        // x=0: H min dist = min(3,0,3,0)=0 → error=0.
        assert_eq!(t.errors_h_u16[0][0][0], 0);
        // x=2: H dists = |2-3|=1, |2-0|=2 → min=1 → error=1.
        assert_eq!(t.errors_h_u16[0][2][0], 1);
    }

    #[test]
    fn stripes_h_are_min_of_group() {
        let t = get();
        for q in 0..8 {
            for x in 0..256 {
                for z in 0..16 {
                    let expected = (0..16)
                        .map(|j| t.errors_h_u16[q][x][z * 16 + j])
                        .min()
                        .unwrap();
                    assert_eq!(
                        t.stripes_h_u16[q][x][z],
                        expected,
                        "q={q} x={x} z={z}"
                    );
                }
            }
        }
    }

    #[test]
    fn errors_alpha_spot_check() {
        let t = get();
        // q=0x10 (scale=1, row=0): scaled = G_TABLE_A[0] = [-3,-6,-9,-15,2,5,8,14]
        // alpha=128, x=128:
        //   mt = [125,122,119,113,130,133,136,142]
        //   dists from 128: [3,6,9,15,2,5,8,14] → min=2 → error=4.
        assert_eq!(t.errors_a(128, 128, 0x10), 4);
    }

    #[test]
    fn stripes_alpha_are_min_of_group() {
        let t = get();
        // Check a small subset to keep the test fast.
        for alpha in [0, 64, 128, 255] {
            for x in [0, 64, 128, 255] {
                for scale in 1..16 {
                    let expected = (0..16)
                        .map(|i| t.errors_a(alpha, x, scale * 16 + i))
                        .min()
                        .unwrap();
                    assert_eq!(
                        t.stripes_a(alpha, x, scale),
                        expected,
                        "alpha={alpha} x={x} scale={scale}"
                    );
                }
            }
        }
    }
}
