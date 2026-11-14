//! ETC2 Enhanced Color Compression: T-mode, H-mode, and Planar mode.
//!
//! Ported from C++ `CompressBlockColorEnhanced` and helpers
//! (Etc2Compress.cpp lines 4664–6536).

use crate::etc2::ssim::SsimAccum;
use crate::etc2::tables::Tables;
use crate::etc2::types::{
    G_SSIM_16K1L, G_SSIM_16K2L, G_TABLE_HT, K_BLUE, K_COLOR, K_GREEN, K_RED, Node,
};
use crate::etc2::utils::{bswap, expand_color4};
use wide::i32x4;

/// Load one BGRA pixel → [G, R, B, A] i32 (same as compress_color::load_color_bgra).
fn load_color_bgra(src: &[u8]) -> [i32; 4] {
    [src[1] as i32, src[2] as i32, src[0] as i32, src[3] as i32]
}

// ── Data Structures ──────────────────────────────────────────────────────────

/// 16-pixel block data for enhanced modes.
#[derive(Clone)]
struct Area {
    pub data: [i32; 64],          // 16 pixels × 4 channels [G,R,B,A]
    pub data_grb: [[i16; 4]; 16], // [G,R,B,0] per pixel
    pub data_gr: [[i16; 4]; 16],  // [G,R,G,R] per pixel
    pub data_gb: [[i16; 4]; 16],  // [G,B,G,B] per pixel
    pub shift: [u8; 16],
    pub count: i32,
}

impl Default for Area {
    fn default() -> Self {
        Self {
            data: [0; 64],
            data_grb: [[0; 4]; 16],
            data_gr: [[0; 4]; 16],
            data_gb: [[0; 4]; 16],
            shift: [0; 16],
            count: 0,
        }
    }
}

/// Surface for Planar mode pixel collection.
#[derive(Clone)]
struct Surface {
    pub mask: [i16; 16],
    pub u_coord: [i16; 16],
    pub v_coord: [i16; 16],
    pub data: [i16; 16],
    pub data_u8: [u8; 16],
}

impl Default for Surface {
    fn default() -> Self {
        Self {
            mask: [0; 16],
            u_coord: [0; 16],
            v_coord: [0; 16],
            data: [0; 16],
            data_u8: [0; 16],
        }
    }
}

/// Prepared bounds for Planar stripe evaluation.
struct PlanarPrepared {
    pub min0: [i16; 8],
    pub min1: [i16; 8],
    pub max0: [i16; 8],
    pub max1: [i16; 8],
}

// ── Core Helpers ─────────────────────────────────────────────────────────────

/// C++ DeriveData (lines 3288–3314) for 16-pixel Area.
fn derive_data_16(area: &mut Area) {
    for i in 0..area.count as usize {
        let g = area.data[i * 4] as i16;
        let r = area.data[i * 4 + 1] as i16;
        let b = area.data[i * 4 + 2] as i16;
        area.data_grb[i] = [g, r, b, 0];
        area.data_gr[i] = [g, r, g, r];
        area.data_gb[i] = [g, b, g, b];
    }
}

/// C++ FilterPixelsColor16 (lines 6443–6467).
fn filter_pixels_color_16(area: &mut Area, order: u64) {
    let mut w = 0usize;
    let mut ord = order;
    // We need a temp copy because we write into the same array we read from.
    let orig = area.data;
    for i in 0..16 {
        let a = orig[i * 4 + 3]; // alpha
        // Always write pixel to position w (C++ does unconditional store)
        for ch in 0..4 {
            area.data[w * 4 + ch] = orig[i * 4 + ch];
        }
        area.shift[w] = (ord & 0xF) as u8;
        ord >>= 4;
        if a != 0 {
            w += 1;
        }
    }
    area.count = w as i32;
}

/// C++ ComputeBounds (lines 4865–4881).
fn compute_bounds(area: &Area, offset: usize) -> [i32; 2] {
    let mut lo = 0xFF;
    let mut hi = 0;
    for k in 0..area.count as usize {
        let v = area.data[k * 4 + offset];
        lo = lo.min(v);
        hi = hi.max(v);
    }
    [lo, hi]
}

// ── CombineStripes + CombineLevels + Sort100 ────────────────────────────────

/// C++ CombineStripes (lines 884–1069) — scalar port.
fn combine_stripes(
    area: &Area,
    offset: usize,
    chunks: &mut [i32; 16],
    stripes: &[[u16; 16]; 256],
    weight: i32,
    _water: i32,
) {
    // Process 4 scales at a time with i32x4
    let mut sums = [i32x4::splat(0); 4]; // 4 × 4 lanes = 16 scales
    for k in 0..area.count as usize {
        let x = area.data[k * 4 + offset] as usize;
        let s = &stripes[x];
        for g in 0..4 {
            let base = g * 4;
            let v = i32x4::new([
                s[base] as i32, s[base + 1] as i32,
                s[base + 2] as i32, s[base + 3] as i32,
            ]);
            sums[g] += v;
        }
    }
    let w64 = weight as i64;
    for g in 0..4 {
        let a = sums[g].to_array();
        for j in 0..4 {
            chunks[g * 4 + j] = ((a[j] as i64) * w64).min(i32::MAX as i64) as i32;
        }
    }
}

/// C++ CombineLevels (lines 1071–1280) — scalar port.
fn combine_levels(
    area: &Area,
    offset: usize,
    nodes: &mut [Node; 257],
    errors: &[[u16; 256]; 256],
    chunks: &[i32; 16],
    weight: i32,
    water: i32,
) {
    let mut w = 0usize;
    let mut level = water;

    for z in 0..16usize {
        if chunks[z] >= water {
            continue;
        }
        for sub in 0..16usize {
            let pair_idx = z * 16 + sub;
            let mut sum = 0u32;
            for k in 0..area.count as usize {
                let x = area.data[k * 4 + offset] as usize;
                sum += errors[x][pair_idx] as u32;
            }
            let err = ((sum as i64) * (weight as i64)).min(i32::MAX as i64) as i32;
            if err < water {
                // Convert table index (Morton-encoded) to (a<<4)|b for FilterLevels
                let a = ((pair_idx >> 4) & 0xC) + ((pair_idx >> 2) & 3);
                let b = ((pair_idx >> 2) & 0xC) + (pair_idx & 3);
                nodes[w] = Node {
                    error: err,
                    color: ((a << 4) | b) as i32,
                };
                level = level.min(err);
                w += 1;
            }
        }
    }
    nodes[256].color = w as i32;
    nodes[256].error = level;
}

/// C++ Sort100 (lines 3252–3266).
fn sort_100(nodes: &mut [Node; 257]) -> usize {
    let n = nodes[256].color as usize;
    if n > 0 {
        nodes[..n].sort_by(|a, b| {
            a.error.cmp(&b.error).then(a.color.cmp(&b.color))
        });
    }
    n
}

// ── 4-Color Error Computation (SIMD via `wide`) ──────────────────────────────
//
// All 4 palette errors are computed in parallel per pixel using i32x4.
// Per-color weighted error fits in i32 (max 255²×715 + 255²×213 + 255²×72 ≈ 65M).

/// Horizontal minimum of 4 i32 lanes.
#[inline(always)]
fn hmin_i32x4(v: i32x4) -> i32 {
    let a = v.to_array();
    a[0].min(a[1]).min(a[2]).min(a[3])
}

/// Computes weighted MSE of each pixel against 4 candidate colors [G,R,B].
fn compute_error_four_grb(
    area: &Area,
    colors: &[[i32; 3]; 4],
    water: i32,
) -> i32 {
    let cg = i32x4::new([colors[0][0], colors[1][0], colors[2][0], colors[3][0]]);
    let cr = i32x4::new([colors[0][1], colors[1][1], colors[2][1], colors[3][1]]);
    let cb = i32x4::new([colors[0][2], colors[1][2], colors[2][2], colors[3][2]]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);
    let wb = i32x4::splat(K_BLUE);

    let mut total = 0i64;
    for k in 0..area.count as usize {
        let g = i32x4::splat(area.data_grb[k][0] as i32);
        let r = i32x4::splat(area.data_grb[k][1] as i32);
        let b = i32x4::splat(area.data_grb[k][2] as i32);

        let dg = g - cg;
        let dr = r - cr;
        let db = b - cb;
        let err = dg * dg * wg + dr * dr * wr + db * db * wb;

        total += hmin_i32x4(err) as i64;
        if total >= water as i64 {
            return water;
        }
    }
    total as i32
}

/// G+R channels only.
fn compute_error_four_gr(
    area: &Area,
    colors: &[[i32; 2]; 4],
    water: i32,
) -> i32 {
    let cg = i32x4::new([colors[0][0], colors[1][0], colors[2][0], colors[3][0]]);
    let cr = i32x4::new([colors[0][1], colors[1][1], colors[2][1], colors[3][1]]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);

    let mut total = 0i64;
    for k in 0..area.count as usize {
        let g = i32x4::splat(area.data_gr[k][0] as i32);
        let r = i32x4::splat(area.data_gr[k][1] as i32);

        let dg = g - cg;
        let dr = r - cr;
        let err = dg * dg * wg + dr * dr * wr;

        total += hmin_i32x4(err) as i64;
        if total >= water as i64 {
            return water;
        }
    }
    total as i32
}

/// G+B channels only.
fn compute_error_four_gb(
    area: &Area,
    colors: &[[i32; 2]; 4],
    water: i32,
) -> i32 {
    let cg = i32x4::new([colors[0][0], colors[1][0], colors[2][0], colors[3][0]]);
    let cb = i32x4::new([colors[0][1], colors[1][1], colors[2][1], colors[3][1]]);
    let wg = i32x4::splat(K_GREEN);
    let wb = i32x4::splat(K_BLUE);

    let mut total = 0i64;
    for k in 0..area.count as usize {
        let g = i32x4::splat(area.data_gb[k][0] as i32);
        let b = i32x4::splat(area.data_gb[k][1] as i32);

        let dg = g - cg;
        let db = b - cb;
        let err = dg * dg * wg + db * db * wb;

        total += hmin_i32x4(err) as i64;
        if total >= water as i64 {
            return water;
        }
    }
    total as i32
}

/// C++ ComputeTableColorFour (lines 4709–4863) — SSIM-based index for 4 colors.
fn compute_table_color_four(
    area: &Area,
    colors: &[[i32; 4]; 4], // 4 colors × [G,R,B,0]
    index: &mut u32,
) {
    let area_size = area.count as usize;
    if area_size == 0 {
        return;
    }

    // Determine which colors are distinct (C++ lines 4718–4727)
    let mut good = 0xFu32;
    // Compare colors pairwise: if c0==c1 → clear bit 1; if c0==c2 → clear 2; etc.
    if colors[0][0..3] == colors[1][0..3] { good &= !2; }
    if colors[0][0..3] == colors[2][0..3] { good &= !4; }
    if colors[0][0..3] == colors[3][0..3] { good &= !8; }
    if colors[1][0..3] == colors[2][0..3] { good &= !4; }
    if colors[1][0..3] == colors[3][0..3] { good &= !8; }
    if colors[2][0..3] == colors[3][0..3] { good &= !8; }

    // Per-pixel: find min-error color(s) as bitmask (SIMD: 4 colors in parallel)
    let cg = i32x4::new([colors[0][0], colors[1][0], colors[2][0], colors[3][0]]);
    let cr = i32x4::new([colors[0][1], colors[1][1], colors[2][1], colors[3][1]]);
    let cb = i32x4::new([colors[0][2], colors[1][2], colors[2][2], colors[3][2]]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);
    let wb = i32x4::splat(K_BLUE);

    let mut ways = [0u32; 16];
    for i in 0..area_size {
        let g = i32x4::splat(area.data_grb[i][0] as i32);
        let r = i32x4::splat(area.data_grb[i][1] as i32);
        let b = i32x4::splat(area.data_grb[i][2] as i32);

        let dg = g - cg;
        let dr = r - cr;
        let db = b - cb;
        let err = dg * dg * wg + dr * dr * wr + db * db * wb;

        let errs = err.to_array();
        let min_e = errs[0].min(errs[1]).min(errs[2]).min(errs[3]);
        let mut way = 0u32;
        for c in 0..4 {
            if errs[c] == min_e {
                way |= 1 << c;
            }
        }
        ways[i] = (way & good) | (1 << 4);
    }

    // Initialise loops to first valid color per pixel
    let mut loops = [0usize; 16];
    for i in 0..area_size {
        let mut k = 0;
        while (ways[i] & (1 << k)) == 0 {
            k += 1;
        }
        loops[i] = k;
    }

    let mut best_ssim = -(K_COLOR as f64 + 0.1);
    let mut codes = 0u32;

    loop {
        // Compute SSIM for current assignment
        let mut accum = SsimAccum::new();
        for i in 0..area_size {
            let mx = colors[loops[i]];
            let mb = [
                area.data[i * 4] as i32,
                area.data[i * 4 + 1] as i32,
                area.data[i * 4 + 2] as i32,
                area.data[i * 4 + 3] as i32,
            ];
            accum.update(mx, mb);
        }

        let closed = accum.close(4); // shift=4 for 16-pixel blocks
        let [ssim_rg_lo, ssim_rg_hi] = closed.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);
        let other = closed.other();
        let [ssim_b, _] = other.final_pair(0, 1, G_SSIM_16K1L, G_SSIM_16K2L);

        // C++ weight order: rg_lo=Green, rg_hi=Red, b=Blue
        let ssim = ssim_rg_lo * K_GREEN as f64
            + ssim_rg_hi * K_RED as f64
            + ssim_b * K_BLUE as f64;

        if best_ssim < ssim {
            best_ssim = ssim;
            let mut v = 0u32;
            for j in 0..area_size {
                v |= (loops[j] as u32) << (j * 2);
            }
            codes = v;
            if best_ssim >= K_COLOR as f64 {
                break;
            }
        }

        // Advance to next combination
        let mut i = 0;
        loop {
            let k = loops[i];
            if ways[i] != (1 << k) as u32 {
                let mut next_k = k + 1;
                while next_k < 4 && (ways[i] & (1 << next_k)) == 0 {
                    next_k += 1;
                }
                if next_k < 4 {
                    loops[i] = next_k;
                    break;
                }
                // Reset to first valid
                let mut first = 0;
                while (ways[i] & (1 << first)) == 0 {
                    first += 1;
                }
                loops[i] = first;
            }
            i += 1;
            if i >= area_size {
                break;
            }
        }
        if i >= area_size {
            break;
        }
    }

    // Encode per-pixel 2-bit codes into index using shift positions
    for j in 0..area_size {
        let shift = area.shift[j] as u32;
        let code = ((codes & 2) << (16 - 1)) | (codes & 1);
        *index |= code << shift;
        codes >>= 2;
    }
}

// ── H-Mode ───────────────────────────────────────────────────────────────────

fn make_h_palette_grb(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 3]; 4] {
    [
        [(a[0] as i32 + d).min(255), (a[1] as i32 + d).min(255), (a[2] as i32 + d).min(255)],
        [(a[0] as i32 - d).max(0), (a[1] as i32 - d).max(0), (a[2] as i32 - d).max(0)],
        [(b[0] as i32 + d).min(255), (b[1] as i32 + d).min(255), (b[2] as i32 + d).min(255)],
        [(b[0] as i32 - d).max(0), (b[1] as i32 - d).max(0), (b[2] as i32 - d).max(0)],
    ]
}

fn make_h_palette_gr(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 2]; 4] {
    [
        [(a[0] as i32 + d).min(255), (a[1] as i32 + d).min(255)],
        [(a[0] as i32 - d).max(0), (a[1] as i32 - d).max(0)],
        [(b[0] as i32 + d).min(255), (b[1] as i32 + d).min(255)],
        [(b[0] as i32 - d).max(0), (b[1] as i32 - d).max(0)],
    ]
}

fn make_h_palette_gb(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 2]; 4] {
    [
        [(a[0] as i32 + d).min(255), (a[2] as i32 + d).min(255)],
        [(a[0] as i32 - d).max(0), (a[2] as i32 - d).max(0)],
        [(b[0] as i32 + d).min(255), (b[2] as i32 + d).min(255)],
        [(b[0] as i32 - d).max(0), (b[2] as i32 - d).max(0)],
    ]
}

/// C++ FilterLevelsH (lines 4883–4905).
fn filter_levels_h(nodes: &mut [Node; 257], lo: i32, hi: i32, radius: i32, water: i32) {
    let l = (lo - radius).max(0);
    let h = (hi + radius).min(255);
    let ab_l = (l - (l >> 4)) >> 4;
    let ab_h = (h - (h >> 4) + 15) >> 4;

    let n = nodes[256].color as usize;
    let mut w = 0;
    for i in 0..n {
        let node = nodes[i];
        let a = node.color >> 4;
        let b = node.color & 0xF;
        if ab_l <= a && a <= ab_h && ab_l <= b && b <= ab_h && node.error < water {
            nodes[w] = node;
            w += 1;
        }
    }
    nodes[256].color = w as i32;
}

/// C++ CompressBlockColorH (lines 4907–5132).
fn compress_block_color_h(
    output: &mut [u8; 8],
    area: &Area,
    input_error: i32,
    bounds: &[[i32; 2]; 3],
) -> i32 {
    let tables = Tables::global();
    let mut water = input_error;

    let mut best_a = [0u8; 4];
    let mut best_b = [0u8; 4];
    let mut best_q: i32 = 0;

    let mut chunks0 = [0i32; 16];
    let mut chunks1 = [0i32; 16];
    let mut chunks2 = [0i32; 16];
    let mut err0 = [Node { error: 0, color: 0 }; 257];
    let mut err1 = [Node { error: 0, color: 0 }; 257];
    let mut err2 = [Node { error: 0, color: 0 }; 257];
    let mut mem_gb = [-1i32; 256];

    for q in 0..8 {
        let stripes = &tables.stripes_h_u16[q];
        let errors = &tables.errors_h_u16[q];

        combine_stripes(area, 0, &mut chunks0, stripes, K_GREEN, water);
        combine_levels(area, 0, &mut err0, errors, &chunks0, K_GREEN, water);
        let min0 = err0[256].error;
        if min0 >= water { continue; }

        combine_stripes(area, 1, &mut chunks1, stripes, K_RED, water - min0);
        combine_levels(area, 1, &mut err1, errors, &chunks1, K_RED, water - min0);
        let min1 = err1[256].error;
        if min0 + min1 >= water { continue; }

        combine_stripes(area, 2, &mut chunks2, stripes, K_BLUE, water - min0 - min1);
        combine_levels(area, 2, &mut err2, errors, &chunks2, K_BLUE, water - min0 - min1);
        let min2 = err2[256].error;
        if min0 + min1 + min2 >= water { continue; }

        // H-mode constraint: a[1] <= b[1]
        let n1_count = err1[256].color as usize;
        for i1 in 0..n1_count {
            let c1 = err1[i1].color;
            if (c1 >> 4) > (c1 & 0xF) {
                err1[i1].error = water;
            }
        }

        let d = G_TABLE_HT[q];

        filter_levels_h(&mut err0, bounds[0][0], bounds[0][1], d, water - min1 - min2);
        filter_levels_h(&mut err1, bounds[1][0], bounds[1][1], d, water - min0 - min2);
        filter_levels_h(&mut err2, bounds[2][0], bounds[2][1], d, water - min0 - min1);

        let n0 = sort_100(&mut err0);
        let n1 = sort_100(&mut err1);
        let n2 = sort_100(&mut err2);

        let mut a = [0u8; 4];
        let mut b = [0u8; 4];

        for i0 in 0..n0 {
            let e0 = err0[i0].error;
            if e0 + min1 + min2 >= water { break; }

            let c0 = err0[i0].color;
            a[0] = expand_color4(c0 >> 4) as u8;
            b[0] = expand_color4(c0 & 0xF) as u8;

            for v in mem_gb.iter_mut().take(n2) { *v = -1; }

            for i1 in 0..n1 {
                let e1_base = err1[i1].error + e0;
                if e1_base + min2 >= water { break; }

                let c1 = err1[i1].color;
                a[1] = expand_color4(c1 >> 4) as u8;
                b[1] = expand_color4(c1 & 0xF) as u8;

                let compare_a1a0_b1b0 =
                    ((a[1] as i32 - b[1] as i32) << 16) + ((a[0] as i32 - b[0] as i32) << 8);
                if compare_a1a0_b1b0 > 0 { continue; }

                // GR error check
                let colors_gr = make_h_palette_gr(&a, &b, d);
                let e1 = compute_error_four_gr(area, &colors_gr, water - min2);
                if e1 + min2 >= water { continue; }

                for i2 in 0..n2 {
                    let e2 = err2[i2].error + e1;
                    if e2 >= water { break; }

                    let c2 = err2[i2].color;
                    a[2] = expand_color4(c2 >> 4) as u8;
                    b[2] = expand_color4(c2 & 0xF) as u8;

                    // H-mode: (a[1]<<16)+(a[0]<<8)+a[2] < (b[1]<<16)+(b[0]<<8)+b[2]
                    if compare_a1a0_b1b0 >= (b[2] as i32 - a[2] as i32) { continue; }

                    // GB error (memoized)
                    let mut egb = mem_gb[i2];
                    if egb < 0 {
                        let colors_gb = make_h_palette_gb(&a, &b, d);
                        egb = compute_error_four_gb(area, &colors_gb, water - err1[i1].error);
                        mem_gb[i2] = egb;
                    }
                    if egb + err1[i1].error >= water { continue; }

                    // Full GRB error
                    let colors_grb = make_h_palette_grb(&a, &b, d);
                    let err = compute_error_four_grb(area, &colors_grb, water);
                    if water > err {
                        water = err;
                        best_a = a;
                        best_b = b;
                        best_q = q as i32;
                    }
                }
            }
        }
    }

    if water >= input_error {
        return water;
    }

    // Swap if odd q (C++ line 5066)
    if best_q & 1 != 0 {
        std::mem::swap(&mut best_a, &mut best_b);
    }

    // Output encoding (C++ lines 5071–5128)
    {
        let mut d_val = (best_q as u32) & 4;
        let mut a_bits = ((best_a[1] & 0xF) as u32) << 27;
        let mut b_bits = ((best_b[1] & 0xF) as u32) << 11;

        d_val += ((best_q as u32) & 2) >> 1;
        a_bits += ((best_a[0] & 0xE) as u32) << 23;
        b_bits += ((best_b[0] & 0xF) as u32) << 7;

        a_bits += ((best_a[0] & 1) as u32) << 20;
        b_bits += ((best_b[2] & 0xF) as u32) << 3;
        a_bits += ((best_a[2] & 8) as u32) << 16;
        a_bits += ((best_a[2] & 7) as u32) << 15;

        let mut c = (a_bits.wrapping_add(b_bits)).wrapping_add(d_val + 2);

        // Fix R channel differential overflow
        let d_r = (c >> 24) & 7;
        if d_r & 4 != 0 {
            let c_r = (c >> 27) & 0xF;
            if c_r + d_r < 8 {
                c = c.wrapping_add(1u32 << 31);
            }
        }

        // Fix G channel
        let c_g = (c >> 19) & 3;
        let d_g = (c >> 16) & 3;
        if c_g + d_g >= 4 {
            c = c.wrapping_add(7u32 << 21);
        } else {
            c = c.wrapping_add(1u32 << 18);
        }

        output[..4].copy_from_slice(&bswap(c).to_le_bytes());

        // Compute SSIM index
        let bq = best_q as usize;
        let d = G_TABLE_HT[bq];
        let pal = make_h_palette_grb(&best_a, &best_b, d);
        let pal4 = [
            [pal[0][0], pal[0][1], pal[0][2], 0],
            [pal[1][0], pal[1][1], pal[1][2], 0],
            [pal[2][0], pal[2][1], pal[2][2], 0],
            [pal[3][0], pal[3][1], pal[3][2], 0],
        ];
        let mut idx = 0u32;
        compute_table_color_four(area, &pal4, &mut idx);
        output[4..8].copy_from_slice(&bswap(idx).to_le_bytes());
    }

    water
}

// ── T-Mode ───────────────────────────────────────────────────────────────────

fn make_t_palette_grb(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 3]; 4] {
    [
        [a[0] as i32, a[1] as i32, a[2] as i32],
        [(b[0] as i32 + d).min(255), (b[1] as i32 + d).min(255), (b[2] as i32 + d).min(255)],
        [b[0] as i32, b[1] as i32, b[2] as i32],
        [(b[0] as i32 - d).max(0), (b[1] as i32 - d).max(0), (b[2] as i32 - d).max(0)],
    ]
}

fn make_t_palette_gr(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 2]; 4] {
    [
        [a[0] as i32, a[1] as i32],
        [(b[0] as i32 + d).min(255), (b[1] as i32 + d).min(255)],
        [b[0] as i32, b[1] as i32],
        [(b[0] as i32 - d).max(0), (b[1] as i32 - d).max(0)],
    ]
}

fn make_t_palette_gb(a: &[u8; 4], b: &[u8; 4], d: i32) -> [[i32; 2]; 4] {
    [
        [a[0] as i32, a[2] as i32],
        [(b[0] as i32 + d).min(255), (b[2] as i32 + d).min(255)],
        [b[0] as i32, b[2] as i32],
        [(b[0] as i32 - d).max(0), (b[2] as i32 - d).max(0)],
    ]
}

/// C++ FilterLevelsT (lines 5134–5159).
fn filter_levels_t(nodes: &mut [Node; 257], lo: i32, hi: i32, radius: i32, water: i32) {
    let a_l = (lo - (lo >> 4)) >> 4;
    let a_h = (hi - (hi >> 4) + 15) >> 4;

    let l = (lo - radius).max(0);
    let h = (hi + radius).min(255);
    let b_l = (l - (l >> 4)) >> 4;
    let b_h = (h - (h >> 4) + 15) >> 4;

    let n = nodes[256].color as usize;
    let mut w = 0;
    for i in 0..n {
        let node = nodes[i];
        let a = node.color >> 4;
        let b = node.color & 0xF;
        if a_l <= a && a <= a_h && b_l <= b && b <= b_h && node.error < water {
            nodes[w] = node;
            w += 1;
        }
    }
    nodes[256].color = w as i32;
}

/// C++ CompressBlockColorT (lines 5161–5351).
fn compress_block_color_t(
    output: &mut [u8; 8],
    area: &Area,
    input_error: i32,
    bounds: &[[i32; 2]; 3],
) -> i32 {
    let tables = Tables::global();
    let mut water = input_error;

    let mut best_a = [0u8; 4];
    let mut best_b = [0u8; 4];
    let mut best_q: i32 = 0;

    let mut chunks0 = [0i32; 16];
    let mut chunks1 = [0i32; 16];
    let mut chunks2 = [0i32; 16];
    let mut err0 = [Node { error: 0, color: 0 }; 257];
    let mut err1 = [Node { error: 0, color: 0 }; 257];
    let mut err2 = [Node { error: 0, color: 0 }; 257];
    let mut mem_gb = [-1i32; 256];

    for q in 0..8 {
        let stripes = &tables.stripes_t_u16[q];
        let errors = &tables.errors_t_u16[q];

        combine_stripes(area, 0, &mut chunks0, stripes, K_GREEN, water);
        combine_levels(area, 0, &mut err0, errors, &chunks0, K_GREEN, water);
        let min0 = err0[256].error;
        if min0 >= water { continue; }

        combine_stripes(area, 1, &mut chunks1, stripes, K_RED, water - min0);
        combine_levels(area, 1, &mut err1, errors, &chunks1, K_RED, water - min0);
        let min1 = err1[256].error;
        if min0 + min1 >= water { continue; }

        combine_stripes(area, 2, &mut chunks2, stripes, K_BLUE, water - min0 - min1);
        combine_levels(area, 2, &mut err2, errors, &chunks2, K_BLUE, water - min0 - min1);
        let min2 = err2[256].error;
        if min0 + min1 + min2 >= water { continue; }

        let d = G_TABLE_HT[q];

        filter_levels_t(&mut err0, bounds[0][0], bounds[0][1], d, water - min1 - min2);
        filter_levels_t(&mut err1, bounds[1][0], bounds[1][1], d, water - min0 - min2);
        filter_levels_t(&mut err2, bounds[2][0], bounds[2][1], d, water - min0 - min1);

        let n0 = sort_100(&mut err0);
        let n1 = sort_100(&mut err1);
        let n2 = sort_100(&mut err2);

        let mut a = [0u8; 4];
        let mut b = [0u8; 4];

        for i0 in 0..n0 {
            let e0 = err0[i0].error;
            if e0 + min1 + min2 >= water { break; }

            let c0 = err0[i0].color;
            a[0] = expand_color4(c0 >> 4) as u8;
            b[0] = expand_color4(c0 & 0xF) as u8;

            for v in mem_gb.iter_mut().take(n2) { *v = -1; }

            for i1 in 0..n1 {
                let e1_base = err1[i1].error + e0;
                if e1_base + min2 >= water { break; }

                let c1 = err1[i1].color;
                a[1] = expand_color4(c1 >> 4) as u8;
                b[1] = expand_color4(c1 & 0xF) as u8;

                // T-mode: GR error check
                let colors_gr = make_t_palette_gr(&a, &b, d);
                let e1 = compute_error_four_gr(area, &colors_gr, water - min2);
                if e1 + min2 >= water { continue; }

                for i2 in 0..n2 {
                    let e2 = err2[i2].error + e1;
                    if e2 >= water { break; }

                    let c2 = err2[i2].color;
                    a[2] = expand_color4(c2 >> 4) as u8;
                    b[2] = expand_color4(c2 & 0xF) as u8;

                    // GB error (memoized)
                    let mut egb = mem_gb[i2];
                    if egb < 0 {
                        let colors_gb = make_t_palette_gb(&a, &b, d);
                        egb = compute_error_four_gb(area, &colors_gb, water - err1[i1].error);
                        mem_gb[i2] = egb;
                    }
                    if egb + err1[i1].error >= water { continue; }

                    // Full GRB error
                    let colors_grb = make_t_palette_grb(&a, &b, d);
                    let err = compute_error_four_grb(area, &colors_grb, water);
                    if water > err {
                        water = err;
                        best_a = a;
                        best_b = b;
                        best_q = q as i32;
                    }
                }
            }
        }
    }

    if water >= input_error {
        return water;
    }

    // T-mode output encoding (C++ lines 5304–5348)
    {
        let mut d_val = ((best_q as u32) & 6) << 1;
        let mut a_bits = ((best_a[1] & 0xC) as u32) << 25;
        let mut b_bits = ((best_b[1] & 0xF) as u32) << 12;

        d_val += (best_q as u32) & 1;
        a_bits += ((best_a[1] & 3) as u32) << 24;
        b_bits += ((best_b[0] & 0xF) as u32) << 8;

        a_bits += ((best_a[0] & 0xF) as u32) << 20;
        b_bits += ((best_b[2] & 0xF) as u32) << 4;
        a_bits += ((best_a[2] & 0xF) as u32) << 16;

        let mut c = (a_bits.wrapping_add(b_bits)).wrapping_add(d_val + 2);

        // Fix R channel
        let c_r = (c >> 27) & 3;
        let d_r = (c >> 24) & 3;
        if c_r + d_r >= 4 {
            c = c.wrapping_add(7u32 << 29);
        } else {
            c = c.wrapping_add(1u32 << 26);
        }

        output[..4].copy_from_slice(&bswap(c).to_le_bytes());

        // SSIM index
        let bq = best_q as usize;
        let d = G_TABLE_HT[bq];
        let pal = make_t_palette_grb(&best_a, &best_b, d);
        let pal4 = [
            [pal[0][0], pal[0][1], pal[0][2], 0],
            [pal[1][0], pal[1][1], pal[1][2], 0],
            [pal[2][0], pal[2][1], pal[2][2], 0],
            [pal[3][0], pal[3][1], pal[3][2], 0],
        ];
        let mut idx = 0u32;
        compute_table_color_four(area, &pal4, &mut idx);
        output[4..8].copy_from_slice(&bswap(idx).to_le_bytes());
    }

    water
}

// ── Planar Helpers ───────────────────────────────────────────────────────────

/// C++ PlanarCollectO (lines 5353–5375): collect anti-diagonal pixels (x+y < 4).
fn planar_collect_o(area: &Area, offset: usize) -> Surface {
    let mut s = Surface::default();
    let mut w = 0usize;
    for i in 0..area.count as usize {
        let pos = area.shift[i] as i32;
        let x = pos >> 2;
        let y = pos & 3;
        let r = x + y;
        if r >= 4 { continue; }
        s.mask[w] = -1;
        s.v_coord[w] = r as i16;
        s.data[w] = area.data[i * 4 + offset] as i16;
        w += 1;
    }
    s
}

/// C++ PlanarCollect (lines 5377–5397): collect all pixels with (x,y) coords.
fn planar_collect(area: &Area, offset: usize) -> Surface {
    let mut s = Surface::default();
    for i in 0..area.count as usize {
        let pos = area.shift[i] as i32;
        let x = pos >> 2;
        let y = pos & 3;
        let d = area.data[i * 4 + offset];
        s.mask[i] = -1;
        s.u_coord[i] = x as i16;
        s.v_coord[i] = y as i16;
        s.data[i] = d as i16;
        s.data_u8[i] = d as u8;
    }
    s
}

/// C++ PlanarStripeO (lines 5401–5450): error for a range [coL..coH].
fn planar_stripe_o(surface: &Surface, co_l: i32, co_h: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 { continue; }
        let r = surface.v_coord[i] as i32;
        let d = surface.data[i] as i32;
        // min possible value = (coL*4 + r*(-coL) + 2) >> 2 = coL + r*(coL_compl)...
        // Simplified: min_val = (coL*4 - coL*r + 2) >> 2, max_val = (coH*4 + (255-coH)*r + 2) >> 2
        let min_val = (co_l * 4 + (-co_l) * r + 2) >> 2;
        let max_val = (co_h * 4 + (255 - co_h) * r + 2) >> 2;
        let e = if d < min_val {
            min_val - d
        } else if d > max_val {
            d - max_val
        } else {
            0
        };
        sum += e * e;
    }
    sum
}

/// C++ PlanarPyramidO (lines 5606–5654): error for single co value.
fn planar_pyramid_o(surface: &Surface, co: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 { continue; }
        let r = surface.v_coord[i] as i32;
        let d = surface.data[i] as i32;
        let min_val = (co * 4 + (-co) * r + 2) >> 2;
        let max_val = (co * 4 + (255 - co) * r + 2) >> 2;
        let e = if d < min_val {
            min_val - d
        } else if d > max_val {
            d - max_val
        } else {
            0
        };
        sum += e * e;
    }
    sum
}

/// C++ PlanarPrepareOH (lines 5452–5479).
fn planar_prepare_oh(surface: &Surface, co: i32, ch_l: i32, ch_h: i32) -> PlanarPrepared {
    let mut p = PlanarPrepared {
        min0: [0; 8], min1: [0; 8], max0: [0; 8], max1: [0; 8],
    };
    let o_val = (co * 4 + 2) as i16;
    for i in 0..16 {
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let m = surface.mask[i];
        let o = if m != 0 { o_val } else { 0 };
        let x = surface.u_coord[i] as i16;
        let min_v = (ch_l - co) as i16;
        let max_v = (ch_h - co) as i16;
        if idx == 0 {
            p.min0[ii] = min_v * x + o;
            p.max0[ii] = max_v * x + o;
        } else {
            p.min1[ii] = min_v * x + o;
            p.max1[ii] = max_v * x + o;
        }
    }
    p
}

/// C++ PlanarPrepareOV (lines 5481–5508).
fn planar_prepare_ov(surface: &Surface, co: i32, cv_l: i32, cv_h: i32) -> PlanarPrepared {
    let mut p = PlanarPrepared {
        min0: [0; 8], min1: [0; 8], max0: [0; 8], max1: [0; 8],
    };
    let o_val = (co * 4 + 2) as i16;
    for i in 0..16 {
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let m = surface.mask[i];
        let o = if m != 0 { o_val } else { 0 };
        let y = surface.v_coord[i] as i16;
        let min_v = (cv_l - co) as i16;
        let max_v = (cv_h - co) as i16;
        if idx == 0 {
            p.min0[ii] = min_v * y + o;
            p.max0[ii] = max_v * y + o;
        } else {
            p.min1[ii] = min_v * y + o;
            p.max1[ii] = max_v * y + o;
        }
    }
    p
}

/// C++ PlanarStripeOH (lines 5510–5556): error for ch range given prepared co+cv bounds.
fn planar_stripe_oh(prepared: &PlanarPrepared, surface: &Surface, co: i32, ch_l: i32, ch_h: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 && (i < surface.data_u8.len()) {
            // skip non-masked pixels
            continue;
        }
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let x = surface.u_coord[i] as i32;
        let d = surface.data_u8[i] as i32;

        let min_base = if idx == 0 { prepared.min0[ii] } else { prepared.min1[ii] } as i32;
        let max_base = if idx == 0 { prepared.max0[ii] } else { prepared.max1[ii] } as i32;

        let min_val = ((ch_l - co) * x + min_base) >> 2;
        let max_val = ((ch_h - co) * x + max_base) >> 2;

        let min_clamped = min_val.max(0).min(255);
        let max_clamped = max_val.max(0).min(255);

        let e = if d < min_clamped {
            min_clamped - d
        } else if d > max_clamped {
            d - max_clamped
        } else {
            0
        };
        sum += e * e;
    }
    sum
}

/// C++ PlanarStripeOV — analogous to PlanarStripeOH but uses v_coord.
fn planar_stripe_ov(prepared: &PlanarPrepared, surface: &Surface, co: i32, cv_l: i32, cv_h: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 {
            continue;
        }
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let y = surface.v_coord[i] as i32;
        let d = surface.data_u8[i] as i32;

        let min_base = if idx == 0 { prepared.min0[ii] } else { prepared.min1[ii] } as i32;
        let max_base = if idx == 0 { prepared.max0[ii] } else { prepared.max1[ii] } as i32;

        let min_val = ((cv_l - co) * y + min_base) >> 2;
        let max_val = ((cv_h - co) * y + max_base) >> 2;

        let min_clamped = min_val.max(0).min(255);
        let max_clamped = max_val.max(0).min(255);

        let e = if d < min_clamped {
            min_clamped - d
        } else if d > max_clamped {
            d - max_clamped
        } else {
            0
        };
        sum += e * e;
    }
    sum
}

/// C++ PlanarPyramidOH (lines 5656–5698): single ch value error.
fn planar_pyramid_oh(prepared: &PlanarPrepared, surface: &Surface, co: i32, ch: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 { continue; }
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let x = surface.u_coord[i] as i32;
        let d = surface.data_u8[i] as i32;

        let base_min = if idx == 0 { prepared.min0[ii] } else { prepared.min1[ii] } as i32;
        let base_max = if idx == 0 { prepared.max0[ii] } else { prepared.max1[ii] } as i32;

        let t = (ch - co) * x;
        let min_val = ((t + base_min) >> 2).max(0).min(255);
        let max_val = ((t + base_max) >> 2).max(0).min(255);

        let e = if d < min_val { min_val - d } else if d > max_val { d - max_val } else { 0 };
        sum += e * e;
    }
    sum
}

/// C++ PlanarPyramidOV — analogous using v_coord.
fn planar_pyramid_ov(prepared: &PlanarPrepared, surface: &Surface, co: i32, cv: i32) -> i32 {
    let mut sum = 0i32;
    for i in 0..16 {
        if surface.mask[i] == 0 { continue; }
        let idx = if i < 8 { 0 } else { 1 };
        let ii = i % 8;
        let y = surface.v_coord[i] as i32;
        let d = surface.data_u8[i] as i32;

        let base_min = if idx == 0 { prepared.min0[ii] } else { prepared.min1[ii] } as i32;
        let base_max = if idx == 0 { prepared.max0[ii] } else { prepared.max1[ii] } as i32;

        let t = (cv - co) * y;
        let min_val = ((t + base_min) >> 2).max(0).min(255);
        let max_val = ((t + base_max) >> 2).max(0).min(255);

        let e = if d < min_val { min_val - d } else if d > max_val { d - max_val } else { 0 };
        sum += e * e;
    }
    sum
}

// ── Planar Search ────────────────────────────────────────────────────────────

/// C++ Planar7 (lines 5745–5994): 7-bit search (128 candidates) for green.
fn planar_7(area: &Area, offset: usize, c: &mut [i32; 3], weight: i32, water: i32) -> i32 {
    let top = (water + weight - 1) / weight;
    let surface_o = planar_collect_o(area, offset);

    let mut nodes_o = [Node { error: 0, color: 0 }; 129]; // 0x80 + sentinel
    let mut best = top;

    // Phase 1: collect O candidates via hierarchical search
    // C++ outer loop: for (int i = 0; i < 0x80; i += 0x20)
    //   co = (i<<1)+(i>>6), then inner loops co += (1<<1) per pixel
    {
        let mut w = 0usize;
        for outer in (0..0x80).step_by(0x20) {
            let mut co = (outer << 1) + (outer >> 6);
            let stripe32 = planar_stripe_o(&surface_o, co, co + (31 << 1));
            if stripe32 < best {
                for _j in 0..8 {
                    let stripe4 = planar_stripe_o(&surface_o, co, co + (3 << 1));
                    if stripe4 < best {
                        for _k in 0..4 {
                            let err = planar_pyramid_o(&surface_o, co);
                            if err < best {
                                nodes_o[w] = Node { error: err, color: co };
                                w += 1;
                            }
                            co += 1 << 1;
                        }
                    } else {
                        co += 4 << 1;
                    }
                }
            }
        }

        if w == 0 { return water; }
        nodes_o[0x80].color = w as i32;
    }

    let surface = planar_collect(area, offset);
    let mut nodes_h = [Node { error: 0, color: 0 }; 129];
    let mut nodes_v = [Node { error: 0, color: 0 }; 129];

    let no = nodes_o[0x80].color as usize;
    for io in 0..no {
        if nodes_o[io].error >= best { continue; }
        let co = nodes_o[io].color;

        // Search H candidates
        {
            let prepared = planar_prepare_ov(&surface, co, 0, 255);
            let mut w = 0usize;
            for outer in (0..0x80).step_by(0x20) {
                let mut ch = (outer << 1) + (outer >> 6);
                let stripe32 = planar_stripe_oh(&prepared, &surface, co, ch, ch + (31 << 1));
                if stripe32 < best {
                    for _j in 0..8 {
                        let stripe4 = planar_stripe_oh(&prepared, &surface, co, ch, ch + (3 << 1));
                        if stripe4 < best {
                            for _k in 0..4 {
                                let err = planar_pyramid_oh(&prepared, &surface, co, ch);
                                if err < best {
                                    nodes_h[w] = Node { error: err, color: ch };
                                    w += 1;
                                }
                                ch += 1 << 1;
                            }
                        } else {
                            ch += 4 << 1;
                        }
                    }
                }
            }
            if w == 0 { continue; }
            nodes_h[0x80].color = w as i32;
        }

        // Search V candidates
        {
            let prepared = planar_prepare_oh(&surface, co, 0, 255);
            let mut w = 0usize;
            for outer in (0..0x80).step_by(0x20) {
                let mut cv = (outer << 1) + (outer >> 6);
                let stripe32 = planar_stripe_ov(&prepared, &surface, co, cv, cv + (31 << 1));
                if stripe32 < best {
                    for _j in 0..8 {
                        let stripe4 = planar_stripe_ov(&prepared, &surface, co, cv, cv + (3 << 1));
                        if stripe4 < best {
                            for _k in 0..4 {
                                let err = planar_pyramid_ov(&prepared, &surface, co, cv);
                                if err < best {
                                    nodes_v[w] = Node { error: err, color: cv };
                                    w += 1;
                                }
                                cv += 1 << 1;
                            }
                        } else {
                            cv += 4 << 1;
                        }
                    }
                }
            }
            if w == 0 { continue; }
            nodes_v[0x80].color = w as i32;
        }

        // Combine H×V candidates
        let mut chunks = [-1i32; 256];
        let nh = nodes_h[0x80].color as usize;
        let nv = nodes_v[0x80].color as usize;

        for ih in 0..nh {
            if nodes_h[ih].error >= best { continue; }
            let ch = nodes_h[ih].color;

            let prepared = planar_prepare_oh(&surface, co, ch & 0xF1, ch | 0x0E);

            for iv in 0..nv {
                if nodes_v[iv].error >= best { continue; }
                let cv = nodes_v[iv].color;

                // Chunk estimate cache
                let ci = ((ch & 0xF0) as u32 + (cv >> 4) as u32) as usize;
                if ci < 256 {
                    let mut estimate = chunks[ci];
                    if estimate < 0 {
                        estimate = planar_stripe_ov(&prepared, &surface, co, cv & 0xF1, cv | 0x0E);
                        chunks[ci] = estimate;
                    }
                    if estimate >= best { continue; }
                }

                // Full error computation
                let mut sum = 0i32;
                for i in 0..area.count as usize {
                    let x = surface.u_coord[i] as i32;
                    let y = surface.v_coord[i] as i32;
                    let d = surface.data[i] as i32;
                    let val = ((co * 4 + (ch - co) * x + (cv - co) * y + 2) >> 2).max(0).min(255);
                    let e = val - d;
                    sum += e * e;
                }

                if best > sum {
                    best = sum;
                    c[0] = co;
                    c[1] = ch;
                    c[2] = cv;
                }
            }
        }
    }

    best * weight
}

/// C++ Planar6 (lines 5996–6245): 6-bit search (64 candidates) for red/blue.
fn planar_6(area: &Area, offset: usize, c: &mut [i32; 3], weight: i32, water: i32) -> i32 {
    let top = (water + weight - 1) / weight;
    let surface_o = planar_collect_o(area, offset);

    let mut nodes_o = [Node { error: 0, color: 0 }; 65]; // 0x40 + sentinel
    let mut best = top;

    // Phase 1: collect O candidates
    // C++ outer loop: for (int i = 0; i < 0x40; i += 0x10)
    //   co = (i<<2)+(i>>4), then inner loops co += (1<<2) per pixel
    {
        let mut w = 0usize;
        for outer in (0..0x40).step_by(0x10) {
            let mut co = (outer << 2) + (outer >> 4);
            let stripe16 = planar_stripe_o(&surface_o, co, co + (15 << 2));
            if stripe16 < best {
                for _j in 0..4 {
                    let stripe4 = planar_stripe_o(&surface_o, co, co + (3 << 2));
                    if stripe4 < best {
                        for _k in 0..4 {
                            let err = planar_pyramid_o(&surface_o, co);
                            if err < best {
                                nodes_o[w] = Node { error: err, color: co };
                                w += 1;
                            }
                            co += 1 << 2;
                        }
                    } else {
                        co += 4 << 2;
                    }
                }
            }
        }

        if w == 0 { return water; }
        nodes_o[0x40].color = w as i32;
    }

    let surface = planar_collect(area, offset);
    let mut nodes_h = [Node { error: 0, color: 0 }; 65];
    let mut nodes_v = [Node { error: 0, color: 0 }; 65];

    let no = nodes_o[0x40].color as usize;
    for io in 0..no {
        if nodes_o[io].error >= best { continue; }
        let co = nodes_o[io].color;

        // Search H
        {
            let prepared = planar_prepare_ov(&surface, co, 0, 255);
            let mut w = 0usize;
            for outer in (0..0x40).step_by(0x10) {
                let mut ch = (outer << 2) + (outer >> 4);
                let stripe16 = planar_stripe_oh(&prepared, &surface, co, ch, ch + (15 << 2));
                if stripe16 < best {
                    for _j in 0..4 {
                        let stripe4 = planar_stripe_oh(&prepared, &surface, co, ch, ch + (3 << 2));
                        if stripe4 < best {
                            for _k in 0..4 {
                                let err = planar_pyramid_oh(&prepared, &surface, co, ch);
                                if err < best {
                                    nodes_h[w] = Node { error: err, color: ch };
                                    w += 1;
                                }
                                ch += 1 << 2;
                            }
                        } else {
                            ch += 4 << 2;
                        }
                    }
                }
            }
            if w == 0 { continue; }
            nodes_h[0x40].color = w as i32;
        }

        // Search V
        {
            let prepared = planar_prepare_oh(&surface, co, 0, 255);
            let mut w = 0usize;
            for outer in (0..0x40).step_by(0x10) {
                let mut cv = (outer << 2) + (outer >> 4);
                let stripe16 = planar_stripe_ov(&prepared, &surface, co, cv, cv + (15 << 2));
                if stripe16 < best {
                    for _j in 0..4 {
                        let stripe4 = planar_stripe_ov(&prepared, &surface, co, cv, cv + (3 << 2));
                        if stripe4 < best {
                            for _k in 0..4 {
                                let err = planar_pyramid_ov(&prepared, &surface, co, cv);
                                if err < best {
                                    nodes_v[w] = Node { error: err, color: cv };
                                    w += 1;
                                }
                                cv += 1 << 2;
                            }
                        } else {
                            cv += 4 << 2;
                        }
                    }
                }
            }
            if w == 0 { continue; }
            nodes_v[0x40].color = w as i32;
        }

        // Combine
        let mut chunks = [-1i32; 256];
        let nh = nodes_h[0x40].color as usize;
        let nv = nodes_v[0x40].color as usize;

        for ih in 0..nh {
            if nodes_h[ih].error >= best { continue; }
            let ch = nodes_h[ih].color;

            let prepared = planar_prepare_oh(&surface, co, ch & 0xF3, ch | 0x0C);

            for iv in 0..nv {
                if nodes_v[iv].error >= best { continue; }
                let cv = nodes_v[iv].color;

                let ci = ((ch & 0xF0) as u32 + (cv >> 4) as u32) as usize;
                if ci < 256 {
                    let mut estimate = chunks[ci];
                    if estimate < 0 {
                        estimate = planar_stripe_ov(&prepared, &surface, co, cv & 0xF3, cv | 0x0C);
                        chunks[ci] = estimate;
                    }
                    if estimate >= best { continue; }
                }

                // Full error
                let mut sum = 0i32;
                for i in 0..area.count as usize {
                    let x = surface.u_coord[i] as i32;
                    let y = surface.v_coord[i] as i32;
                    let d = surface.data[i] as i32;
                    let val = ((co * 4 + (ch - co) * x + (cv - co) * y + 2) >> 2).max(0).min(255);
                    let e = val - d;
                    sum += e * e;
                }

                if best > sum {
                    best = sum;
                    c[0] = co;
                    c[1] = ch;
                    c[2] = cv;
                }
            }
        }
    }

    best * weight
}

/// C++ PlanarLinear (lines 6247–6343): least-squares feasibility check.
fn planar_linear(area: &Area, offset: usize, weight: i32, water: i32) -> i32 {
    let mut vx = [0i32; 13];
    let mut vy = [0i32; 13];
    let mut vz = [0i32; 13];

    let mut k = 0usize;
    for i in 0..area.count as usize {
        let pos = area.shift[i] as i32;
        let x = pos >> 2;
        let y = pos & 3;
        let r = x + y;
        if r > 4 { continue; }
        let z = area.data[i * 4 + offset];
        vx[k] = x;
        vy[k] = y;
        vz[k] = z;
        k += 1;
    }
    if k <= 3 { return 0; }

    let mut sx = 0i64;
    let mut sy = 0i64;
    let mut sz = 0i64;
    for i in 0..k {
        sx += vx[i] as i64;
        sy += vy[i] as i64;
        sz += vz[i] as i64;
    }

    let mut sxx = 0i64;
    let mut syy = 0i64;
    let mut sxy = 0i64;
    let mut syz = 0i64;
    let mut szx = 0i64;
    let kk = k as i64;
    for i in 0..k {
        let rx = vx[i] as i64 * kk - sx;
        let ry = vy[i] as i64 * kk - sy;
        let rz = vz[i] as i64 * kk - sz;
        sxx += rx * rx;
        syy += ry * ry;
        sxy += rx * ry;
        syz += ry * rz;
        szx += rz * rx;
    }

    let cc = sxx * syy - sxy * sxy;
    if cc == 0 { return 0; }

    let a = syz * sxy - szx * syy;
    let b = szx * sxy - syz * sxx;
    let q = a * sx + b * sy + cc * sz;
    let ka = a * kk;
    let kb = b * kk;
    let kc = cc * kk;

    let mut sum = 0i64;
    for i in 0..k {
        let mut e = vx[i] as i64 * ka + vy[i] as i64 * kb + vz[i] as i64 * kc - q;
        if e < 0 { e = -e; }
        e /= kc;
        if e > 0 { e -= 1; }
        sum += e * e;
    }

    sum *= weight as i64;
    if sum >= water as i64 {
        return water;
    }
    sum as i32
}

/// C++ CompressBlockColorP (lines 6345–6441).
fn compress_block_color_p(output: &mut [u8; 8], area: &Area, input_error: i32) -> i32 {
    let mut g = [0i32; 3];
    let mut r = [0i32; 3];
    let mut b = [0i32; 3];

    let water = input_error;

    let min_g = planar_linear(area, 0, K_GREEN, water);
    if min_g >= water { return water; }

    let min_r = planar_linear(area, 1, K_RED, water - min_g);
    if min_r >= water - min_g { return water; }

    let min_b = planar_linear(area, 2, K_BLUE, water - min_g - min_r);
    if min_b >= water - min_g - min_r { return water; }

    let mut err = planar_7(area, 0, &mut g, K_GREEN, water - min_r - min_b);
    if err >= water - min_r - min_b { return water; }

    err += planar_6(area, 1, &mut r, K_RED, water - err - min_b);
    if err >= water - min_b { return water; }

    err += planar_6(area, 2, &mut b, K_BLUE, water - err);
    if err >= water { return water; }

    // P-mode output encoding (C++ lines 6377–6437)
    {
        let mut co0 = (((r[0] >> 2) & 0x3F) as u32) << 25;
        let mut ch0 = (((r[1] >> 2) & 0x3E) as u32) << 1;
        let mut ch1 = (((g[1] >> 1) & 0x7F) as u32) << 25;
        let mut cv1 = (((r[2] >> 2) & 0x3F) as u32) << 13;

        co0 += (((g[0] >> 1) & 0x40) as u32) << 18;
        ch0 += ((r[1] >> 2) & 1) as u32;
        ch1 += (((b[1] >> 2) & 0x3F) as u32) << 19;
        cv1 += (((g[2] >> 1) & 0x7F) as u32) << 6;

        co0 += (((g[0] >> 1) & 0x3F) as u32) << 17;
        cv1 += ((b[2] >> 2) & 0x3F) as u32;
        co0 += (((b[0] >> 2) & 0x20) as u32) << 11;

        co0 += (((b[0] >> 2) & 0x18) as u32) << 8;
        co0 += (((b[0] >> 2) & 7) as u32) << 7;

        let mut d0 = co0.wrapping_add(ch0).wrapping_add(2);
        let d1 = ch1.wrapping_add(cv1);

        // Fix R channel
        let d_r = (d0 >> 24) & 7;
        if d_r & 4 != 0 {
            let c_r = (d0 >> 27) & 0xF;
            if c_r + d_r < 8 {
                d0 = d0.wrapping_add(1u32 << 31);
            }
        }

        // Fix G channel
        let d_g = (d0 >> 16) & 7;
        if d_g & 4 != 0 {
            let c_g = (d0 >> 19) & 0xF;
            if c_g + d_g < 8 {
                d0 = d0.wrapping_add(1u32 << 23);
            }
        }

        // Fix B channel
        let c_b = (d0 >> 11) & 3;
        let d_b = (d0 >> 8) & 3;
        if c_b + d_b >= 4 {
            d0 = d0.wrapping_add(7u32 << 13);
        } else {
            d0 = d0.wrapping_add(1u32 << 10);
        }

        output[..4].copy_from_slice(&bswap(d0).to_le_bytes());
        output[4..8].copy_from_slice(&bswap(d1).to_le_bytes());
    }

    err
}

// ── Top-Level Enhanced Compression ───────────────────────────────────────────

/// C++ CompressBlockColorEnhanced (lines 6469–6536).
pub(crate) fn compress_block_color_enhanced(
    output: &mut [u8; 8],
    cell: &[u8],
    stride: usize,
    input_error: i32,
) -> i32 {
    let mut area = Area::default();

    // Load 16 pixels
    for row in 0..4usize {
        for col in 0..4usize {
            let off = row * stride + col * 4;
            let pix = load_color_bgra(&cell[off..]);
            let idx = (row * 4 + col) * 4;
            area.data[idx] = pix[0];
            area.data[idx + 1] = pix[1];
            area.data[idx + 2] = pix[2];
            area.data[idx + 3] = pix[3];
        }
    }

    filter_pixels_color_16(&mut area, 0xFB73EA62D951C840u64);
    derive_data_16(&mut area);

    let mut err = input_error;

    if err > 0 {
        let err_p = compress_block_color_p(output, &area, err);
        if err > err_p {
            err = err_p;
        }
    }

    if err > 0 {
        let mut bounds = [[0i32; 2]; 3];
        bounds[0] = compute_bounds(&area, 0);
        bounds[1] = compute_bounds(&area, 1);
        bounds[2] = compute_bounds(&area, 2);

        let err_h = compress_block_color_h(output, &area, err, &bounds);
        if err > err_h {
            err = err_h;
        }

        if err > 0 {
            let err_t = compress_block_color_t(output, &area, err, &bounds);
            if err > err_t {
                err = err_t;
            }
        }
    }

    err
}

// ── Tests ────────────────────────────────────────────────────────────────────



