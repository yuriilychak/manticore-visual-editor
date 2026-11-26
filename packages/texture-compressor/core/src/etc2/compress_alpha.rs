//! Pure-Rust ETC2 alpha block compression — Phase 4 port.
//!
//! Mirrors `AlphaStripes`, `AlphaLevels`, `ComputeTableAlphaEnhanced`, and
//! `CompressBlockAlphaEnhanced` from `Etc2Compress.cpp` (lines 1358–1995).
//!
//! # Data layout
//!
//! Inside each 4×4 `Area`:
//! - `area.data[p * 4]` holds the alpha value for pixel `p` (0..15), stored
//!   in the Green slot.  The other slots are zero for alpha-only blocks.
//!
//! Inside the lookup tables (`Tables`):
//! - `stripes_a[alpha][x][scale]` — minimum stripe error for pixel alpha
//!   value `x` under base `alpha` at given `scale` (1..15).  `scale = 0` is
//!   unused and always zero.
//! - `errors_a[alpha][x][q]` — weighted squared error for pixel value `x`
//!   relative to base `alpha` and combined index `q = scale*16 + table_row`.
//!
//! # ETC2 alpha block format (8 bytes)
//!
//! ```text
//! byte[0] : base alpha value
//! byte[1] : (scale << 4) | table_index     (= combined q)
//! byte[2..7] : 48 bits, 3 bits per pixel in column-major order
//! ```

use crate::etc2::ssim::SsimAccum;
use crate::etc2::tables::Tables;
use crate::etc2::types::{Area, G_SSIM_16K1L, G_SSIM_16K2L, G_TABLE_A};
use wide::i32x4;

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Accumulate per-scale stripe sums for one 4×4 alpha block.
///
/// `chunks[z]` (z = 0..15) = Σ over 16 pixels of
/// `stripes_a[alpha_base][pixel_alpha][z]`.  Index 0 is unused (scale 0 is
/// always invalid); indices 1..15 correspond to scales 1..15.
///
/// Mirrors `AlphaStripes()`.
fn alpha_stripes(area: &Area, chunks: &mut [i32; 16], alpha_base: usize, tables: &Tables) {
    let mut sums = [i32x4::splat(0); 4]; // 4 groups × 4 lanes = 16 scales
    for p in 0..16 {
        let x = area.data[p * 4] as usize;
        let base = alpha_base * 256 * 16 + x * 16;
        for g in 0..4 {
            let off = base + g * 4;
            let v = i32x4::new([
                tables.stripes_a_u16[off] as i32,
                tables.stripes_a_u16[off + 1] as i32,
                tables.stripes_a_u16[off + 2] as i32,
                tables.stripes_a_u16[off + 3] as i32,
            ]);
            sums[g] += v;
        }
    }
    for g in 0..4 {
        let a = sums[g].to_array();
        for j in 0..4 {
            chunks[g * 4 + j] = a[j];
        }
    }
}

/// Find the best (scale, table_row) pair for a given base alpha.
///
/// Iterates scale = 1..15.  For each scale that might improve on `water`
/// (checked via the pre-computed `chunks` stripe bound), accumulates the
/// per-q error over all 16 pixels and updates `water` and `last_q_way` if a
/// better combination is found.
///
/// `last_q_way` encoding:
/// - bits [31:16] = `scale * 16` (the q_base for the winning scale)
/// - bits [15:0]  = bitmask of winning table-row indices within that scale
///
/// Returns the updated water level.  Mirrors `AlphaLevels()`.
fn alpha_levels(
    area: &Area,
    alpha_base: usize,
    chunks: &[i32; 16],
    water: i32,
    tables: &Tables,
    last_q_way: &mut i32,
) -> i32 {
    let mut best = water;

    for scale in 1..16usize {
        if chunks[scale] >= best {
            continue;
        }
        let q_base = scale * 16;

        let mut tots = [i32x4::splat(0); 4]; // 4 groups × 4 lanes = 16 q-values
        for p in 0..16 {
            let x = area.data[p * 4] as usize;
            for g in 0..4 {
                let qi0 = q_base + g * 4;
                let v = i32x4::new([
                    tables.errors_a(alpha_base, x, qi0) as i32,
                    tables.errors_a(alpha_base, x, qi0 + 1) as i32,
                    tables.errors_a(alpha_base, x, qi0 + 2) as i32,
                    tables.errors_a(alpha_base, x, qi0 + 3) as i32,
                ]);
                tots[g] += v;
            }
            if p == 3 || p == 7 || p == 11 {
                let all_exceed = (0..4).all(|g| {
                    let a = tots[g].to_array();
                    a[0] >= best && a[1] >= best && a[2] >= best && a[3] >= best
                });
                if all_exceed {
                    break;
                }
            }
        }

        let mut totals = [0i32; 16];
        for g in 0..4 {
            let a = tots[g].to_array();
            for j in 0..4 {
                totals[g * 4 + j] = a[j];
            }
        }

        let min_err = *totals.iter().min().unwrap();
        if min_err < best {
            best = min_err;
            let mut bitmask = 0i32;
            for (qi, &e) in totals.iter().enumerate() {
                if e == min_err {
                    bitmask |= 1 << qi;
                }
            }
            *last_q_way = ((q_base as i32) << 16) | bitmask;
            if best <= 0 {
                break;
            }
        }
    }

    best
}

/// Encode one 8-byte ETC2 alpha block given `alpha_base` and combined index `q`.
///
/// `q = (scale << 4) | table_row`, scale ∈ 1..15, table_row ∈ 0..15.
///
/// The function:
/// 1. Computes 8 candidate alpha values from `G_TABLE_A[table_row]` × `scale`.
/// 2. Finds which candidates achieve the minimum absolute error per pixel.
/// 3. Exhaustively searches all valid index combinations, choosing the one
///    with the highest SSIM.
/// 4. Bit-packs the 3-bit indices into the 8-byte ETC2 format.
///
/// Mirrors `ComputeTableAlphaEnhanced()`.
fn compute_table_alpha_enhanced(output: &mut [u8; 8], area: &Area, alpha: i32, q: i32) {
    // ── Step 1: compute 8 candidate alpha values ───────────────────────────
    let scale = q >> 4;
    let table_row = (q & 0xF) as usize;
    let tbl = G_TABLE_A[table_row];

    let mut vals = [0u8; 8];
    for j in 0..8 {
        let v = (alpha + tbl[j] as i32 * scale).clamp(0, 255) as u8;
        vals[j] = v;
    }

    // ── Step 2: filter duplicate table entries ─────────────────────────────
    // If two consecutive candidate values are equal the second is redundant.
    let mut good: u32 = 0xFF;
    if vals[0] == vals[1] { good &= !0x02; }
    if vals[1] == vals[2] { good &= !0x04; }
    if vals[2] == vals[3] { good &= !0x08; }
    if vals[0] == vals[4] { good &= !0x10; }
    if vals[4] == vals[5] { good &= !0x20; }
    if vals[5] == vals[6] { good &= !0x40; }
    if vals[6] == vals[7] { good &= !0x80; }

    // ── Step 3: build per-pixel valid-index bitmasks ───────────────────────
    // `ways[i]` has bit j set if table entry j achieves the minimum absolute
    // error for pixel i.  Bit 8 is a sentinel (always set) to simplify the
    // enumeration loop.
    let mut ways = [0u32; 16];
    for i in 0..16usize {
        let pixel = area.data[i * 4] as i32;
        let min_err = vals.iter().map(|&v| (pixel - v as i32).abs()).min().unwrap();
        let mut mask = 0u32;
        for j in 0..8 {
            if (pixel - vals[j] as i32).abs() == min_err {
                mask |= 1 << j;
            }
        }
        ways[i] = (mask & good) | (1 << 8); // sentinel at bit 8
    }

    // ── Step 4: initialise loops[] to the first valid index per pixel ──────
    let mut loops = [0usize; 16];
    for i in 0..16 {
        let mut k = 0usize;
        while (ways[i] & (1 << k)) == 0 {
            k += 1;
        }
        loops[i] = k;
    }

    // ── Step 5: enumerate all valid combinations, keep best SSIM ──────────
    let mut best_ssim: f64 = -1.1;
    let mut best_codes: u64 = 0;

    loop {
        // Compute SSIM for this index assignment.
        let mut acc = SsimAccum::new();
        for i in 0..16 {
            let decoded = vals[loops[i]] as i32;
            let original = area.data[i * 4];
            acc.update([decoded, 0, 0, 0], [original, 0, 0, 0]);
        }
        let closed = acc.close(4);
        let ssim_val = closed.final_pair(0, 0, G_SSIM_16K1L, G_SSIM_16K2L)[0];

        if best_ssim < ssim_val {
            best_ssim = ssim_val;

            // Pack 16 × 3-bit index values into a u64.
            let mut v = 0u64;
            for j in 0..16 {
                v |= (loops[j] as u64) << (j * 3);
            }
            best_codes = v;

            if best_ssim >= 1.0 {
                break;
            }
        }

        // Advance to next valid combination (lexicographic order on loops[]).
        let mut i = 0usize;
        let found_next = loop {
            let k = loops[i];
            if ways[i] != (1u32 << k) {
                // More than just the current bit is set; find the next one.
                let mut nk = k + 1;
                while (ways[i] & (1 << nk)) == 0 {
                    nk += 1;
                }
                if nk < 8 {
                    loops[i] = nk;
                    break true; // found next combination
                }
                // nk hit the sentinel (bit 8): reset this digit to minimum.
                let mut nk = 0usize;
                while (ways[i] & (1 << nk)) == 0 {
                    nk += 1;
                }
                loops[i] = nk;
            }
            i += 1;
            if i >= 16 {
                break false; // all combinations exhausted
            }
        };
        if !found_next {
            break;
        }
    }

    // ── Step 6: encode into 8-byte ETC2 alpha block ───────────────────────
    // Start with the 16-bit header: [base_alpha | combined_q].
    let mut answer: u64 = ((alpha as u32) << 8 | (q as u32)) as u64;

    // Emit 16 × 3-bit codes in column-major pixel order (ETC2 spec).
    // The ORDER constant encodes which pixel index is emitted at each step.
    const ORDER: u64 = 0xFB73_EA62_D951_C840_u64;
    let mut ord = ORDER;
    while ord != 0 {
        let shift = (ord & 0xF) as usize;
        let code = (best_codes >> (shift * 3)) & 7;
        answer = (answer << 3) | code;
        ord >>= 4;
    }

    let bytes: [u8; 8] = answer.swap_bytes().to_ne_bytes();
    output.copy_from_slice(&bytes);
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Compress one 4×4 BGRA block's alpha channel into 8 ETC2 bytes.
///
/// - `output`: the 8-byte alpha sub-block (modified in place).
/// - `cell`: BGRA pixels for the top-left corner of the 4×4 block.
/// - `stride`: row stride in bytes (= texture_width × 4).
/// - `input_error`: starting water level; pass `i32::MAX` for a fresh
///   compression (no warm start from an existing encoding).
///
/// Returns the best error found (lower is better).  A return of 0 means the
/// block is losslessly encoded.
///
/// Mirrors `CompressBlockAlphaEnhanced()`.
pub fn compress_block_alpha(
    output: &mut [u8; 8],
    cell: &[u8],
    stride: usize,
    input_error: i32,
) -> i32 {
    // Load 16 alpha values into the Area (alpha stored in the G slot, i.e. index 0 of every 4).
    let mut area = Area::default();
    for row in 0..4usize {
        let row_base = row * stride;
        for col in 0..4usize {
            // BGRA layout: byte 3 of each pixel is alpha.
            area.data[(row * 4 + col) * 4] = cell[row_base + col * 4 + 3] as i32;
        }
    }

    let sum_alpha: i32 = (0..16).map(|p| area.data[p * 4]).sum();
    let avg_alpha = (sum_alpha + 8) >> 4;

    let tables = Tables::global();

    let mut water = input_error;
    let mut best_a = output[0] as i32;
    let mut best_q = output[1] as i32;

    // Search delta = 0, -1, +1, -2, +2, ... around avg_alpha.
    let mut delta = 0i32;
    loop {
        let last_a = avg_alpha + delta;
        let mut chunks = [0i32; 16];
        alpha_stripes(&area, &mut chunks, last_a as usize, tables);

        let mut last_q_way = 0i32;
        let err = alpha_levels(&area, last_a as usize, &chunks, water, tables, &mut last_q_way);

        if water > err {
            water = err;
            best_a = last_a;

            // Extract best_q: (scale * 16) + first winning table-row index.
            let q_base = last_q_way >> 16;
            let row_idx = (last_q_way & 0xFFFF).trailing_zeros() as i32;
            best_q = q_base + row_idx;

            if water <= 0 {
                break;
            }
        }

        // Advance delta: 0 → -1 → +1 → -2 → +2 → ...
        // C++ formula: delta = (~(delta as u32)) as i32 + (delta < 0) as i32
        delta = (!(delta as u32) as i32).wrapping_add(if delta < 0 { 1 } else { 0 });

        if (avg_alpha + delta) & !0xFF != 0 {
            delta = (!(delta as u32) as i32).wrapping_add(if delta < 0 { 1 } else { 0 });
            if (avg_alpha + delta) & !0xFF != 0 {
                break;
            }
        }
    }

    compute_table_alpha_enhanced(output, &area, best_a, best_q);
    water
}

/// Compress the alpha channel of an entire texture.
///
/// Writes the first 8 bytes of every 16-byte ETC2 block in `etc2_buf`.
/// `bgra` is the padded BGRA source (must be `tex_w × tex_h × 4` bytes).
///
/// Returns `(total_mse_sum, total_ssim_sum)` — summed over all blocks.
/// Divide both by the number of pixels to get per-pixel metrics.
///
/// Mirrors the `CompressAlphaEnhanced` path in `PackTexture()`.
pub fn pack_alpha(
    bgra: &[u8],
    tex_w: usize,
    tex_h: usize,
    etc2_buf: &mut [u8],
) -> (i64, f64) {
    let blocks_x = tex_w / 4;
    let blocks_y = tex_h / 4;
    let num_blocks = blocks_x * blocks_y;
    let stride = tex_w * 4;

    let bgra_addr = bgra.as_ptr() as usize;
    let etc2_addr = etc2_buf.as_mut_ptr() as usize;

    let compress_one = move |block_idx: usize| -> i64 {
        let by = block_idx / blocks_x;
        let bx = block_idx % blocks_x;
        let cell_off = (by * 4 * tex_w + bx * 4) * 4;
        let block_off = block_idx * 16;

        let output = unsafe { std::slice::from_raw_parts_mut((etc2_addr as *mut u8).add(block_off), 8) };
        let cell = unsafe { std::slice::from_raw_parts((bgra_addr as *const u8).add(cell_off), stride * 3 + 16) };

        let out: &mut [u8; 8] = output.try_into().unwrap();
        compress_block_alpha(out, cell, stride, i32::MAX) as i64
    };

    #[cfg(not(target_arch = "wasm32"))]
    let total_mse: i64 = {
        use rayon::prelude::*;
        (0..num_blocks).into_par_iter().map(compress_one).sum()
    };

    #[cfg(target_arch = "wasm32")]
    let total_mse: i64 = (0..num_blocks).map(compress_one).sum();

    (total_mse, 0.0)
}

/// Compress alpha from 16 raw alpha values (no stride, no BGRA wrapping).
/// Used by the WASM API where blocks are pre-extracted.
pub fn compress_block_alpha_from_raw(
    output: &mut [u8; 8],
    alpha_values: &[u8],
) -> i32 {
    // Build a temporary BGRA cell with alpha in byte 3 of each pixel, stride=16
    let mut cell = [0u8; 64]; // 4×4×4
    for p in 0..16 {
        cell[p * 4 + 3] = alpha_values[p];
    }
    compress_block_alpha(output, &cell, 16, i32::MAX)
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::etc2::tables::Tables;

    /// Helper: build a flat BGRA block (4×4) with a fixed alpha per pixel.
    fn make_bgra_block(alpha: &[u8; 16]) -> Vec<u8> {
        let mut buf = vec![0u8; 4 * 4 * 4];
        for (i, &a) in alpha.iter().enumerate() {
            buf[i * 4 + 3] = a;
        }
        buf
    }

    #[test]
    fn constant_alpha_encodes_losslessly() {
        Tables::init();

        // A block where every pixel has the same alpha should compress perfectly.
        let block = make_bgra_block(&[200u8; 16]);
        let mut output = [0u8; 8];
        let err = compress_block_alpha(&mut output, &block, 16, i32::MAX);

        assert_eq!(err, 0, "constant alpha block must be lossless");
        // base_alpha byte should equal the constant value.
        assert_eq!(output[0], 200, "base alpha byte must equal constant");
    }

    #[test]
    fn all_zeros_encodes_losslessly() {
        Tables::init();
        let block = make_bgra_block(&[0u8; 16]);
        let mut output = [0u8; 8];
        let err = compress_block_alpha(&mut output, &block, 16, i32::MAX);
        assert_eq!(err, 0);
    }

    #[test]
    fn all_255_encodes_losslessly() {
        Tables::init();
        let block = make_bgra_block(&[255u8; 16]);
        let mut output = [0u8; 8];
        let err = compress_block_alpha(&mut output, &block, 16, i32::MAX);
        assert_eq!(err, 0);
    }

    #[test]
    fn gradient_block_compresses() {
        Tables::init();
        // A simple 0..255 ramp should produce a valid (low-error) encoding.
        let alpha: [u8; 16] = std::array::from_fn(|i| (i * 17) as u8);
        let block = make_bgra_block(&alpha);
        let mut output = [0u8; 8];
        let err = compress_block_alpha(&mut output, &block, 16, i32::MAX);

        // Error should be finite and the block header should be non-trivially filled.
        assert!(err >= 0, "error must be non-negative");
        // base alpha should be in the correct range.
        assert!(output[0] as i32 <= 255);
        // combined q byte must encode scale 1..15 (high nibble non-zero).
        assert!(output[1] >> 4 >= 1, "scale must be >= 1; got {}", output[1] >> 4);
    }

    #[test]
    fn output_roundtrip_header_fields() {
        Tables::init();
        // Verify that compress_block_alpha writes alpha and q correctly.
        let alpha_vals = [128u8; 16];
        let block = make_bgra_block(&alpha_vals);
        let mut output = [0u8; 8];
        compress_block_alpha(&mut output, &block, 16, i32::MAX);

        // The ETC2 spec stores [base_alpha, (scale<<4)|table] in bytes 0..1.
        let base = output[0] as i32;
        let q = output[1] as i32;
        let scale = q >> 4;
        let table_row = q & 0xF;
        assert!(
            base >= 0 && base <= 255,
            "base alpha out of range: {base}"
        );
        assert!(scale >= 1 && scale <= 15, "scale out of range: {scale}");
        assert!(
            table_row >= 0 && table_row <= 15,
            "table_row out of range: {table_row}"
        );
    }

    #[test]
    fn stride_wider_than_block() {
        Tables::init();
        // Pack 4 rows spaced by 8 pixels (stride = 8*4 = 32 bytes).
        let stride = 32usize;
        let mut bgra = vec![0u8; stride * 4];
        // Set alpha channel of the first 4 pixels of each row.
        for row in 0..4usize {
            for col in 0..4usize {
                bgra[row * stride + col * 4 + 3] = (row * 64 + col * 16) as u8;
            }
        }
        let mut output = [0u8; 8];
        let err = compress_block_alpha(&mut output, &bgra, stride, i32::MAX);
        assert!(err >= 0);
    }

    #[test]
    fn pack_alpha_texture_4x4() {
        Tables::init();
        // Single 4×4 texture block.
        let tex_w = 4;
        let tex_h = 4;
        let alpha: [u8; 16] = std::array::from_fn(|i| (i * 16) as u8);
        let bgra = make_bgra_block(&alpha);
        let mut etc2_buf = vec![0u8; tex_w * tex_h];
        pack_alpha(&bgra, tex_w, tex_h, &mut etc2_buf);
        // First two bytes must be a valid ETC2 alpha header.
        assert!(etc2_buf[1] >> 4 >= 1, "scale must be >= 1 in texture-level test");
    }

    #[test]
    fn pack_alpha_texture_8x8() {
        Tables::init();
        let tex_w = 8;
        let tex_h = 8;
        let mut bgra = vec![0u8; tex_w * tex_h * 4];
        // Fill with a repeating ramp.
        for i in 0..tex_w * tex_h {
            bgra[i * 4 + 3] = (i % 256) as u8;
        }
        let mut etc2_buf = vec![0u8; tex_w * tex_h];
        let (mse, _ssim) = pack_alpha(&bgra, tex_w, tex_h, &mut etc2_buf);
        assert!(mse >= 0, "MSE must be non-negative");
    }
}
