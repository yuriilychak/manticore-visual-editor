//! Pure-Rust ETC2 colour compression — Individual (4-bit) and Differential (5-bit) modes.
//!
//! Mirrors `CompressBlockColor()` in `Etc2Compress.cpp` (lines 4527–4664).
//! T/H/Planar modes (`CompressBlockColorEnhanced`) are Phase 5b.

use crate::etc2::sort::{sort_network_2, sort_network_4, sort_network_6, sort_network_8};
use crate::etc2::sort::{sort_nodes_10, sort_nodes_20};
use crate::etc2::ssim::{SsimAccum};
use crate::etc2::tables::Tables;
use crate::etc2::types::*;
use crate::etc2::utils::bswap;
use wide::i32x4;

// Channel weights are inlined via K_GREEN/K_RED/K_BLUE in SIMD i32x4 splats.

// ── Saturating arithmetic for u8 palette construction ────────────────────────

#[inline(always)]
fn sat_add_u8(a: i32, b: i32) -> i32 {
    (a + b).min(255)
}

#[inline(always)]
fn sat_sub_u8(a: i32, b: i32) -> i32 {
    (a - b).max(0)
}

// ── load_color_bgra: BGRA bytes → GRB+A i32 layout ──────────────────────────
//
// Mirrors `load_color_BGRA` (C++ line 3268):
//   cvtepu8_epi32  → [B, G, R, A]
//   shuffle(3,0,2,1) → [G, R, B, A]

#[inline(always)]
fn load_color_bgra(src: &[u8]) -> [i32; 4] {
    [src[1] as i32, src[2] as i32, src[0] as i32, src[3] as i32]
}

// ── derive_data: populate DataGRB / DataGR / DataGB from Data ────────────────
//
// Mirrors `DeriveData()` (C++ line 3288).
// In scalar mode: stores [ch0, ch1, ch2, 0] into data_grb, etc.
// These are used by SSIM but NOT by our scalar error functions.

fn derive_data_half(half: &mut Half) {
    for i in 0..half.count as usize {
        let d = &half.data[i * 4..];
        let (d0, d1, d2) = (d[0], d[1], d[2]);
        half.data_grb[i] = [d0, d1, d2, 0];
        half.data_gr[i] = [d0, d1, d0, d1];
        half.data_gb[i] = [d0, d2, d0, d2];
    }
}

// ── compute_error_grb: scalar port of ComputeErrorGRB ────────────────────────
//
// Computes weighted per-pixel min error over the 4-entry palette {c±q0, c±q1}
// for all 3 channels (G, R, B positions), accumulated over all pixels in the
// half-block.  Returns early if the sum reaches `water`.

fn compute_error_grb(half: &Half, color: &[u8], water: i32, q: usize) -> i32 {
    let q0 = G_TABLE[q][0];
    let q1 = G_TABLE[q][1];

    let c = [color[0] as i32, color[1] as i32, color[2] as i32];

    // 4-entry palette per channel, packed into i32x4 lanes
    let pg = i32x4::new([
        sat_add_u8(c[0], q0), sat_add_u8(c[0], q1),
        sat_sub_u8(c[0], q0), sat_sub_u8(c[0], q1),
    ]);
    let pr = i32x4::new([
        sat_add_u8(c[1], q0), sat_add_u8(c[1], q1),
        sat_sub_u8(c[1], q0), sat_sub_u8(c[1], q1),
    ]);
    let pb = i32x4::new([
        sat_add_u8(c[2], q0), sat_add_u8(c[2], q1),
        sat_sub_u8(c[2], q0), sat_sub_u8(c[2], q1),
    ]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);
    let wb = i32x4::splat(K_BLUE);

    let mut sum = 0i32;
    for i in 0..half.count as usize {
        let px = &half.data[i * 4..];
        let g = i32x4::splat(px[0]);
        let r = i32x4::splat(px[1]);
        let b = i32x4::splat(px[2]);

        let dg = pg - g;
        let dr = pr - r;
        let db = pb - b;
        let err = dg * dg * wg + dr * dr * wr + db * db * wb;

        let a = err.to_array();
        sum += a[0].min(a[1]).min(a[2]).min(a[3]);
        if sum >= water {
            return water;
        }
    }
    sum
}

// ── compute_error_gr: scalar port of ComputeErrorGR ──────────────────────────
//
// Same as compute_error_grb but only channels 0 and 1 (G, R positions).

fn compute_error_gr(half: &Half, color: &[u8], water: i32, q: usize) -> i32 {
    let q0 = G_TABLE[q][0];
    let q1 = G_TABLE[q][1];

    let c0 = color[0] as i32;
    let c1 = color[1] as i32;

    let pg = i32x4::new([
        sat_add_u8(c0, q0), sat_add_u8(c0, q1),
        sat_sub_u8(c0, q0), sat_sub_u8(c0, q1),
    ]);
    let pr = i32x4::new([
        sat_add_u8(c1, q0), sat_add_u8(c1, q1),
        sat_sub_u8(c1, q0), sat_sub_u8(c1, q1),
    ]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);

    let mut sum = 0i32;
    for i in 0..half.count as usize {
        let px = &half.data[i * 4..];
        let g = i32x4::splat(px[0]);
        let r = i32x4::splat(px[1]);

        let dg = pg - g;
        let dr = pr - r;
        let err = dg * dg * wg + dr * dr * wr;

        let a = err.to_array();
        sum += a[0].min(a[1]).min(a[2]).min(a[3]);
        if sum >= water {
            return water;
        }
    }
    sum
}

// ── filter_pixels_color: compact non-transparent pixels ──────────────────────
//
// Mirrors `FilterPixelsColor()` (C++ line 4464).

fn filter_pixels_color(half: &mut Half, mut order: u32) {
    let mut w = 0usize;
    for i in 0..8usize {
        let alpha = half.data[i * 4 + 3];
        if alpha != 0 {
            // Copy pixel data to compacted position
            if w != i {
                for ch in 0..4 {
                    half.data[w * 4 + ch] = half.data[i * 4 + ch];
                }
            }
            half.shift[w] = (order & 0xF) as u8;
            w += 1;
        }
        order >>= 4;
    }
    half.count = w as i32;
}

// ── estimate_chroma_dispersion ───────────────────────────────────────────────
//
// Mirrors `EstimateChromaDispersion()` (C++ line 4490).

fn estimate_chroma_dispersion(half: &Half) -> f64 {
    static G_R_NN: [f64; 7] = [
        K_RED as f64 / (2.0 * 2.0),
        K_RED as f64 / (3.0 * 3.0),
        K_RED as f64 / (4.0 * 4.0),
        K_RED as f64 / (5.0 * 5.0),
        K_RED as f64 / (6.0 * 6.0),
        K_RED as f64 / (7.0 * 7.0),
        K_RED as f64 / (8.0 * 8.0),
    ];
    static G_B_NN: [f64; 7] = [
        K_BLUE as f64 / (2.0 * 2.0),
        K_BLUE as f64 / (3.0 * 3.0),
        K_BLUE as f64 / (4.0 * 4.0),
        K_BLUE as f64 / (5.0 * 5.0),
        K_BLUE as f64 / (6.0 * 6.0),
        K_BLUE as f64 / (7.0 * 7.0),
        K_BLUE as f64 / (8.0 * 8.0),
    ];

    let n = half.count as usize;
    if n < 2 {
        return 0.0;
    }

    let (mut sr, mut sb, mut srr, mut sbb) = (0i32, 0i32, 0i32, 0i32);
    for i in 0..n {
        let g = half.data[i * 4];
        let r = half.data[i * 4 + 1] - g;
        let b = half.data[i * 4 + 2] - g;
        sr += r;
        sb += b;
        srr += r * r;
        sbb += b * b;
    }

    let ni = n as i32;
    (srr * ni - sr * sr) as f64 * G_R_NN[n - 2]
        + (sbb * ni - sb * sb) as f64 * G_B_NN[n - 2]
}

// ── guess_levels: 4-bit candidate accumulation ───────────────────────────────
//
// Mirrors `GuessLevels()` (C++ line 524).
//
// For each of 16 base colours (Individual mode), accumulate the per-pixel error
// for channel `offset`.  Emit (weighted_error, colour) nodes for candidates
// that beat the water threshold.

fn guess_levels(
    half: &Half,
    offset: usize,
    nodes: &mut [Node; 17],
    weight: i32,
    water: i32,
    q: usize,
    tables: &Tables,
) {
    // Accumulate per-colour sums over all pixels
    let mut sums = [0i32; 16];
    for p in 0..half.count as usize {
        let x = half.data[p * 4 + offset] as usize;
        for i in 0..16 {
            sums[i] = sums[i].saturating_add(tables.errors4[q][x][i]);
        }
    }

    let top = if weight > 0 {
        ((water as i64 + weight as i64 - 1) / weight as i64).min(i32::MAX as i64) as i32
    } else {
        water
    };

    let mut w = 0usize;
    let mut level = water;
    for i in 0..16 {
        if sums[i] < top {
            let weighted = sums[i].saturating_mul(weight);
            nodes[w] = Node::new(weighted, G_COLORS4[i]);
            if level > weighted {
                level = weighted;
            }
            w += 1;
        }
    }

    nodes[0x10] = Node::new(level, w as i32);
}

// ── adjust_levels: 5-bit candidate accumulation ──────────────────────────────
//
// Mirrors `AdjustLevels()` (C++ line 695).
// Same as guess_levels but for 32 base colours (Differential mode).

fn adjust_levels(
    half: &Half,
    offset: usize,
    nodes: &mut [Node; 33],
    weight: i32,
    water: i32,
    q: usize,
    tables: &Tables,
) {
    let mut sums = [0i32; 32];
    for p in 0..half.count as usize {
        let x = half.data[p * 4 + offset] as usize;
        for i in 0..32 {
            sums[i] = sums[i].saturating_add(tables.errors5[q][x][i]);
        }
    }

    let top = if weight > 0 {
        ((water as i64 + weight as i64 - 1) / weight as i64).min(i32::MAX as i64) as i32
    } else {
        water
    };

    let mut w = 0usize;
    let mut level = water;
    for i in 0..32 {
        if sums[i] < top {
            let weighted = sums[i].saturating_mul(weight);
            nodes[w] = Node::new(weighted, G_COLORS5[i]);
            if level > weighted {
                level = weighted;
            }
            w += 1;
        }
    }

    nodes[0x20] = Node::new(level, w as i32);
}

// ── GuessStateColor: per-table-index state for Individual mode ───────────────

struct GuessStateColor {
    node0: [Node; 18],
    node1: [Node; 18],
    node2: [Node; 18],
    stop: i32,
}

impl GuessStateColor {
    fn new() -> Self {
        Self {
            node0: [Node::WORST; 18],
            node1: [Node::WORST; 18],
            node2: [Node::WORST; 18],
            stop: i32::MAX,
        }
    }

    fn init(&mut self, half: &Half, water: i32, q: usize, tables: &Tables) {
        // Transmute [Node;18] → [Node;17] for the first 17 elements
        let n0 = unsafe { &mut *(self.node0.as_mut_ptr() as *mut [Node; 17]) };
        let n1 = unsafe { &mut *(self.node1.as_mut_ptr() as *mut [Node; 17]) };
        let n2 = unsafe { &mut *(self.node2.as_mut_ptr() as *mut [Node; 17]) };

        guess_levels(half, 0, n0, K_GREEN, water, q, tables);
        self.stop = n0[0x10].error;
        if self.stop >= water {
            return;
        }

        guess_levels(half, 1, n1, K_RED, water - self.stop, q, tables);
        self.stop += n1[0x10].error;
        if self.stop >= water {
            return;
        }

        guess_levels(half, 2, n2, K_BLUE, water - self.stop, q, tables);
        self.stop += n2[0x10].error;
    }

    fn sort(&mut self, water: i32) {
        let n0 = unsafe { &mut *(self.node0.as_mut_ptr() as *mut [Node; 17]) };
        let n1 = unsafe { &mut *(self.node1.as_mut_ptr() as *mut [Node; 17]) };
        let n2 = unsafe { &mut *(self.node2.as_mut_ptr() as *mut [Node; 17]) };

        sort_nodes_10(n0, water - n1[0x10].error - n2[0x10].error);
        sort_nodes_10(n1, water - n0[0x10].error - n2[0x10].error);
        sort_nodes_10(n2, water - n0[0x10].error - n1[0x10].error);
    }
}

// ── AdjustStateColor: per-table-index state for Differential mode ────────────

struct AdjustStateColor {
    flag_sort: bool,
    flag_error: bool,
    flag_minimum: bool,
    flag_swap: bool,

    stop: i32,
    flag0: u32,
    flag1: u32,
    flag2: u32,

    node0: [Node; 34],
    node1: [Node; 34],
    node2: [Node; 34],

    errors_g: [i32; 0x20],
    errors_gr: [i32; 0x20 * 0x20],
    lazy_gr: [bool; 0x20 * 0x20],
    errors_grb: Box<[i32; 0x20 * 0x20 * 0x20]>,

    swap0: [i32; 0x20],
    swap1: [i32; 0x20],
    swap2: [i32; 0x20],

    diff0: [[Node; 10]; 0x20],
    diff1: [[Node; 10]; 0x20],
    diff2: [[Node; 10]; 0x20],
}

impl AdjustStateColor {
    fn init(&mut self, half: &Half, water: i32, q: usize, tables: &Tables) {
        self.flag_sort = false;
        self.flag_error = false;
        self.flag_minimum = false;
        self.flag_swap = false;

        let n0 = unsafe { &mut *(self.node0.as_mut_ptr() as *mut [Node; 33]) };
        let n1 = unsafe { &mut *(self.node1.as_mut_ptr() as *mut [Node; 33]) };
        let n2 = unsafe { &mut *(self.node2.as_mut_ptr() as *mut [Node; 33]) };

        adjust_levels(half, 0, n0, K_GREEN, water, q, tables);
        self.stop = n0[0x20].error;
        if self.stop >= water {
            return;
        }

        adjust_levels(half, 1, n1, K_RED, water - self.stop, q, tables);
        self.stop += n1[0x20].error;
        if self.stop >= water {
            return;
        }

        adjust_levels(half, 2, n2, K_BLUE, water - self.stop, q, tables);
        self.stop += n2[0x20].error;
    }

    fn sort(&mut self, water: i32) {
        if self.flag_sort {
            return;
        }
        self.flag_sort = true;

        let n0 = unsafe { &mut *(self.node0.as_mut_ptr() as *mut [Node; 33]) };
        let n1 = unsafe { &mut *(self.node1.as_mut_ptr() as *mut [Node; 33]) };
        let n2 = unsafe { &mut *(self.node2.as_mut_ptr() as *mut [Node; 33]) };

        sort_nodes_20(n0, water - n1[0x20].error - n2[0x20].error);
        sort_nodes_20(n1, water - n0[0x20].error - n2[0x20].error);
        sort_nodes_20(n2, water - n0[0x20].error - n1[0x20].error);
    }

    fn walk(&mut self, half: &Half, water: i32, q: usize) {
        if self.flag_error {
            return;
        }
        self.flag_error = true;
        self.do_walk(half, water, q);
    }

    fn do_walk(&mut self, half: &Half, water: i32, q: usize) {
        let mut c = [0u8; 4];
        let mut min01 = water - self.node2[0x20].error;

        let n0_count = self.node0[0x20].color;
        let n1_count = self.node1[0x20].color;

        for c0 in 0..n0_count as usize {
            let e0 = self.node0[c0].error;
            if e0 + self.node1[0x20].error + self.node2[0x20].error >= water {
                break;
            }
            c[0] = self.node0[c0].color as u8;

            let mut min1 = water - self.node2[0x20].error;

            for c1 in 0..n1_count as usize {
                let e1_approx = self.node1[c1].error + e0;
                if e1_approx + self.node2[0x20].error >= water {
                    break;
                }
                c[1] = self.node1[c1].color as u8;

                let e1 = compute_error_gr(half, &c, water - self.node2[0x20].error, q);
                if min1 > e1 {
                    min1 = e1;
                }

                let origin_gr = (c0 << 5) + c1;
                self.errors_gr[origin_gr] = e1;
                self.lazy_gr[origin_gr] = true;
            }

            self.errors_g[c0] = min1;
            if min01 > min1 {
                min01 = min1;
            }
        }

        self.stop = min01 + self.node2[0x20].error;
    }

    fn bottom(&mut self, half: &Half, water: i32, q: usize) {
        if self.flag_minimum {
            return;
        }
        self.flag_minimum = true;
        self.do_bottom(half, water, q);
    }

    fn do_bottom(&mut self, half: &Half, water: i32, q: usize) {
        let mut c = [0u8; 4];
        let blue_max = 0xFF;
        let mut minimum = water.min(
            self.stop - self.node2[0x20].error
                + (blue_max * blue_max * K_BLUE) * half.count,
        );

        let n0_count = self.node0[0x20].color;
        let n1_count = self.node1[0x20].color;
        let n2_count = self.node2[0x20].color;

        for c0 in 0..n0_count as usize {
            let e0 = self.node0[c0].error;
            if e0 + self.node1[0x20].error + self.node2[0x20].error >= minimum {
                break;
            }
            if self.errors_g[c0] + self.node2[0x20].error >= minimum {
                continue;
            }
            c[0] = self.node0[c0].color as u8;

            for c1 in 0..n1_count as usize {
                let e1_approx = self.node1[c1].error + e0;
                if e1_approx + self.node2[0x20].error >= minimum {
                    break;
                }
                let origin_gr = (c0 << 5) + c1;
                let e1 = self.errors_gr[origin_gr];
                if e1 + self.node2[0x20].error >= minimum {
                    continue;
                }
                c[1] = self.node1[c1].color as u8;
                self.lazy_gr[origin_gr] = false;

                let origin = origin_gr << 5;

                for c2 in 0..n2_count as usize {
                    let e2_approx = self.node2[c2].error + e1;
                    if e2_approx >= minimum {
                        self.errors_grb[c2 + origin] = -1;
                        continue;
                    }
                    c[2] = self.node2[c2].color as u8;

                    let e2 = compute_error_grb(half, &c, water, q);
                    self.errors_grb[c2 + origin] = e2;
                    if minimum > e2 {
                        minimum = e2;
                    }
                }
            }
        }

        self.stop = minimum;
    }

    fn index(&mut self) {
        if self.flag_swap {
            return;
        }
        self.flag_swap = true;

        self.swap0 = [-1i32; 0x20];
        self.swap1 = [-1i32; 0x20];
        self.swap2 = [-1i32; 0x20];

        let n0_count = self.node0[0x20].color as usize;
        for i in 0..n0_count {
            let c0 = (self.node0[i].color >> 3) as usize;
            self.swap0[c0] = i as i32;
        }
        let n1_count = self.node1[0x20].color as usize;
        for i in 0..n1_count {
            let c1 = (self.node1[i].color >> 3) as usize;
            self.swap1[c1] = i as i32;
        }
        let n2_count = self.node2[0x20].color as usize;
        for i in 0..n2_count {
            let c2 = (self.node2[i].color >> 3) as usize;
            self.swap2[c2] = i as i32;
        }

        self.flag0 = 0;
        self.flag1 = 0;
        self.flag2 = 0;
    }
}

// ── AdjustStateColorGroup ────────────────────────────────────────────────────

pub struct AdjustStateColorGroup {
    s: [AdjustStateColor; 8],
}

impl AdjustStateColorGroup {
    fn new() -> Box<Self> {
        // Allocate directly on the heap to avoid stack overflow
        unsafe {
            let layout = std::alloc::Layout::new::<Self>();
            let ptr = std::alloc::alloc_zeroed(layout) as *mut Self;
            if ptr.is_null() {
                std::alloc::handle_alloc_error(layout);
            }
            // Initialize each AdjustStateColor properly.
            // IMPORTANT: use std::ptr::write for Box fields to avoid dropping
            // the zeroed (null-pointer) Box that alloc_zeroed created.
            // On native, dealloc(null) is a no-op; in WASM it traps.
            for i in 0..8 {
                let s = &raw mut (*ptr).s[i];
                std::ptr::write(&raw mut (*s).flag_sort, false);
                std::ptr::write(&raw mut (*s).flag_error, false);
                std::ptr::write(&raw mut (*s).flag_minimum, false);
                std::ptr::write(&raw mut (*s).flag_swap, false);
                std::ptr::write(&raw mut (*s).stop, i32::MAX);
                std::ptr::write(&raw mut (*s).flag0, 0);
                std::ptr::write(&raw mut (*s).flag1, 0);
                std::ptr::write(&raw mut (*s).flag2, 0);
                std::ptr::write(&raw mut (*s).node0, [Node::WORST; 34]);
                std::ptr::write(&raw mut (*s).node1, [Node::WORST; 34]);
                std::ptr::write(&raw mut (*s).node2, [Node::WORST; 34]);
                // errors_g, errors_gr, lazy_gr are zeroed from alloc_zeroed
                // errors_grb: direct heap alloc to avoid vec! brk thrashing
                let grb_layout = std::alloc::Layout::new::<[i32; 0x20 * 0x20 * 0x20]>();
                let ptr_grb = std::alloc::alloc_zeroed(grb_layout) as *mut [i32; 0x20 * 0x20 * 0x20];
                if ptr_grb.is_null() {
                    std::alloc::handle_alloc_error(grb_layout);
                }
                std::ptr::write(&raw mut (*s).errors_grb, Box::from_raw(ptr_grb));
                std::ptr::write(&raw mut (*s).swap0, [-1; 0x20]);
                std::ptr::write(&raw mut (*s).swap1, [-1; 0x20]);
                std::ptr::write(&raw mut (*s).swap2, [-1; 0x20]);
                std::ptr::write(&raw mut (*s).diff0, [[Node::WORST; 10]; 0x20]);
                std::ptr::write(&raw mut (*s).diff1, [[Node::WORST; 10]; 0x20]);
                std::ptr::write(&raw mut (*s).diff2, [[Node::WORST; 10]; 0x20]);
            }
            Box::from_raw(ptr)
        }
    }

    fn init(&mut self, half: &Half, water: i32, tables: &Tables) {
        for q in 0..8 {
            self.s[q].init(half, water, q, tables);
        }
    }

    /// Reset all state for reuse without reallocating errors_grb boxes.
    fn reset(&mut self) {
        for i in 0..8 {
            self.s[i].flag_sort = false;
            self.s[i].flag_error = false;
            self.s[i].flag_minimum = false;
            self.s[i].flag_swap = false;
            self.s[i].stop = i32::MAX;
            self.s[i].flag0 = 0;
            self.s[i].flag1 = 0;
            self.s[i].flag2 = 0;
            self.s[i].node0 = [Node::WORST; 34];
            self.s[i].node1 = [Node::WORST; 34];
            self.s[i].node2 = [Node::WORST; 34];
            self.s[i].errors_g = [0; 0x20];
            self.s[i].errors_gr = [0; 0x20 * 0x20];
            self.s[i].lazy_gr = [false; 0x20 * 0x20];
            self.s[i].errors_grb.fill(0);
            self.s[i].swap0 = [-1; 0x20];
            self.s[i].swap1 = [-1; 0x20];
            self.s[i].swap2 = [-1; 0x20];
            self.s[i].diff0 = [[Node::WORST; 10]; 0x20];
            self.s[i].diff1 = [[Node::WORST; 10]; 0x20];
            self.s[i].diff2 = [[Node::WORST; 10]; 0x20];
        }
    }

    fn best(&self, water: i32) -> i32 {
        let mut best = water;
        for q in 0..8 {
            if best > self.s[q].stop {
                best = self.s[q].stop;
            }
        }
        best
    }
}

// ── differential_colors3 ────────────────────────────────────────────────────
//
// Mirrors `DifferentialColors3()` (C++ line 4186).

fn differential_colors3(
    id: usize,
    flag: &mut u32,
    node: &[Node],
    swap: &[i32; 0x20],
    diff: &mut [Node; 10],
    water: i32,
) -> i32 {
    if (*flag & (1u32 << id)) == 0 {
        *flag |= 1u32 << id;

        let ld = if id >= 4 { id - 4 } else { 0 };
        let hd = (id + 3).min(31);

        let mut w = 0usize;
        for d in ld..=hd {
            let b = swap[d];
            if b < 0 {
                continue;
            }
            let error = node[b as usize].error;
            diff[w] = Node::new(error, b);
            if error < water {
                w += 1;
            }
        }

        diff[8].color = w as i32;
        diff[w].error = water;

        if w <= 2 {
            if w + 1 < 10 {
                diff[w + 1].error = water;
            }
            if w >= 2 {
                sort_network_2(&mut diff[0..2]);
            }
        } else if w <= 4 {
            sort_network_4(&mut diff[0..4]);
        } else if w <= 6 {
            sort_network_6(&mut diff[0..6]);
        } else {
            sort_network_8(&mut diff[0..8]);
        }
    }

    diff[0].error
}

// ── BlockStateColor ──────────────────────────────────────────────────────────

struct BlockStateColor {
    a: [u8; 4],
    b: [u8; 4],
    qa: usize,
    qb: usize,
    mode: i32,
}

impl BlockStateColor {
    fn new() -> Self {
        Self {
            a: [0; 4],
            b: [0; 4],
            qa: 0,
            qb: 0,
            mode: 0,
        }
    }
}

// ── guess_color4: Individual-mode search ─────────────────────────────────────
//
// Mirrors `GuessColor4()` (C++ line 4103).

fn guess_color4(
    half: &Half,
    color: &mut [u8; 4],
    mut water: i32,
    table: &mut usize,
    tables: &Tables,
) -> i32 {
    let mut gs = GuessStateColor::new();

    for q in 0..8usize {
        gs.init(half, water, q, tables);
        if gs.stop >= water {
            continue;
        }
        gs.sort(water);

        let mut c = [0u8; 4];
        let n0 = &gs.node0;
        let n1 = &gs.node1;
        let n2 = &gs.node2;

        let n0_count = n0[0x10].color;
        let n1_count = n1[0x10].color;
        let n2_count = n2[0x10].color;

        for c0 in 0..n0_count as usize {
            let e0 = n0[c0].error;
            if e0 + n1[0x10].error + n2[0x10].error >= water {
                break;
            }
            c[0] = n0[c0].color as u8;

            for c1 in 0..n1_count as usize {
                let e1_approx = n1[c1].error + e0;
                if e1_approx + n2[0x10].error >= water {
                    break;
                }
                c[1] = n1[c1].color as u8;

                let e1 = compute_error_gr(half, &c, water - n2[0x10].error, q);
                if e1 + n2[0x10].error >= water {
                    continue;
                }

                for c2 in 0..n2_count as usize {
                    let e2_approx = n2[c2].error + e1;
                    if e2_approx >= water {
                        break;
                    }
                    c[2] = n2[c2].color as u8;

                    let e2 = compute_error_grb(half, &c, water, q);
                    if water > e2 {
                        water = e2;
                        color.copy_from_slice(&c);
                        *table = q;
                    }
                }
            }
        }
    }
    water
}

// ── compress_block_color44: Individual mode ──────────────────────────────────
//
// Mirrors `CompressBlockColor44()` (C++ line 4164).

fn compress_block_color44(
    s: &mut BlockStateColor,
    elem: &Elem,
    water: i32,
    mode: i32,
    tables: &Tables,
) -> i32 {
    let mut a = [0u8; 4];
    let mut qa = 0usize;

    let err = guess_color4(&elem.a, &mut a, water, &mut qa, tables);
    if err >= water {
        return water;
    }

    let mut b = [0u8; 4];
    let mut qb = 0usize;
    let total = err + guess_color4(&elem.b, &mut b, water - err, &mut qb, tables);
    if total >= water {
        return water;
    }

    s.a = a;
    s.b = b;
    s.qa = qa;
    s.qb = qb;
    s.mode = mode;
    total
}

// ── adjust_colors53: Differential-mode nested search ─────────────────────────
//
// Mirrors `AdjustColors53()` (C++ line 4236).

#[allow(clippy::too_many_arguments)]
fn adjust_colors53(
    elem: &Elem,
    color: &mut [u8; 4],
    other: &mut [u8; 4],
    mut water: i32,
    qa: usize,
    qb: usize,
    sa: &mut AdjustStateColor,
    sb: &mut AdjustStateColor,
    best_a: i32,
    best_b: i32,
) -> i32 {
    let mut a = [0u8; 4];
    let mut b = [0u8; 4];

    sb.sort(water - best_a);
    sb.walk(&elem.b, water - best_a, qb);
    if best_a.max(sa.stop) + sb.stop >= water {
        return water;
    }

    sb.bottom(&elem.b, water - best_a, qb);
    if best_a.max(sa.stop) + sb.stop >= water {
        return water;
    }

    sa.sort(water - best_b);
    sa.walk(&elem.a, water - best_b, qa);
    if sa.stop + sb.stop >= water {
        return water;
    }

    sa.bottom(&elem.a, water - best_b, qa);
    if sa.stop + sb.stop >= water {
        return water;
    }

    sb.index();

    let mut most = water - sb.stop;

    let sa_n0_count = sa.node0[0x20].color;
    let sa_n1_count = sa.node1[0x20].color;
    let sa_n2_count = sa.node2[0x20].color;

    for a0 in 0..sa_n0_count as usize {
        let e0 = sa.node0[a0].error;
        if e0 + sa.node1[0x20].error + sa.node2[0x20].error >= most {
            break;
        }
        if sa.errors_g[a0] + sa.node2[0x20].error >= most {
            continue;
        }

        a[0] = sa.node0[a0].color as u8;
        let id0 = (a[0] >> 3) as usize;
        let min0 = differential_colors3(
            id0,
            &mut sb.flag0,
            &sb.node0,
            &sb.swap0,
            &mut sb.diff0[id0],
            water - best_a,
        );

        if sa.errors_g[a0] + sa.node2[0x20].error + min0 + sb.node1[0x20].error + sb.node2[0x20].error >= water {
            continue;
        }

        for a1 in 0..sa_n1_count as usize {
            let e1_approx = sa.node1[a1].error + e0;
            if e1_approx + sa.node2[0x20].error >= most {
                break;
            }
            let a_origin_gr = (a0 << 5) + a1;
            let e1 = sa.errors_gr[a_origin_gr];
            if e1 + sa.node2[0x20].error >= most {
                continue;
            }

            let a_origin = a_origin_gr << 5;

            a[1] = sa.node1[a1].color as u8;
            let id1 = (a[1] >> 3) as usize;
            let min1 = differential_colors3(
                id1,
                &mut sb.flag1,
                &sb.node1,
                &sb.swap1,
                &mut sb.diff1[id1],
                water - best_a,
            );

            if e1 + sa.node2[0x20].error + min0 + min1 + sb.node2[0x20].error >= water {
                continue;
            }

            if sa.lazy_gr[a_origin_gr] {
                sa.lazy_gr[a_origin_gr] = false;
                for c2 in 0..sa_n2_count as usize {
                    sa.errors_grb[c2 + a_origin] = -1;
                }
            }

            for a2 in 0..sa_n2_count as usize {
                let e2_approx = sa.node2[a2].error + e1;
                if e2_approx >= most {
                    break;
                }

                a[2] = sa.node2[a2].color as u8;

                let mut ea = sa.errors_grb[a2 + a_origin];
                if ea < 0 {
                    ea = compute_error_grb(&elem.a, &a, water - best_b, qa);
                    sa.errors_grb[a2 + a_origin] = ea;
                }

                let e2 = ea;
                if e2 >= most {
                    continue;
                }

                let id2 = (a[2] >> 3) as usize;
                let min2 = differential_colors3(
                    id2,
                    &mut sb.flag2,
                    &sb.node2,
                    &sb.swap2,
                    &mut sb.diff2[id2],
                    water - best_a,
                );

                if e2 + min0 + min1 + min2 >= water {
                    continue;
                }

                let diff0_count = sb.diff0[id0][8].color;
                for d0 in 0..diff0_count as usize {
                    let e3 = sb.diff0[id0][d0].error + e2;
                    if e3 + min1 + min2 >= water {
                        break;
                    }

                    let b0 = sb.diff0[id0][d0].color as usize;
                    if e2 + sb.errors_g[b0] + min2 >= water {
                        continue;
                    }

                    let diff1_count = sb.diff1[id1][8].color;
                    for d1 in 0..diff1_count as usize {
                        let e4 = sb.diff1[id1][d1].error + e3;
                        if e4 + min2 >= water {
                            break;
                        }

                        let b1 = sb.diff1[id1][d1].color as usize;
                        let b_origin_gr = (b0 << 5) + b1;
                        let e4 = sb.errors_gr[b_origin_gr] + e2;
                        if e4 + min2 >= water {
                            continue;
                        }

                        let b_origin = b_origin_gr << 5;

                        if sb.lazy_gr[b_origin_gr] {
                            sb.lazy_gr[b_origin_gr] = false;
                            let sb_n2_count = sb.node2[0x20].color;
                            for c2 in 0..sb_n2_count as usize {
                                sb.errors_grb[c2 + b_origin] = -1;
                            }
                        }

                        let diff2_count = sb.diff2[id2][8].color;
                        for d2 in 0..diff2_count as usize {
                            let e5 = sb.diff2[id2][d2].error + e4;
                            if e5 >= water {
                                break;
                            }

                            let b2 = sb.diff2[id2][d2].color as usize;
                            let mut eb = sb.errors_grb[b2 + b_origin];
                            if eb < 0 {
                                b[0] = sb.node0[b0].color as u8;
                                b[1] = sb.node1[b1].color as u8;
                                b[2] = sb.node2[b2].color as u8;
                                eb = compute_error_grb(&elem.b, &b, water - best_a, qb);
                                sb.errors_grb[b2 + b_origin] = eb;
                            }

                            let e5 = eb + e2;
                            if water > e5 {
                                water = e5;
                                most = water - sb.stop;

                                color.copy_from_slice(&a);
                                other[0] = sb.node0[b0].color as u8;
                                other[1] = sb.node1[b1].color as u8;
                                other[2] = sb.node2[b2].color as u8;
                            }
                        }
                    }
                }
            }
        }
    }

    water
}

// ── compress_block_color53: Differential mode ────────────────────────────────
//
// Mirrors `CompressBlockColor53()` (C++ line 4413).

fn compress_block_color53(
    s: &mut BlockStateColor,
    elem: &Elem,
    mut water: i32,
    mode: i32,
    tables: &Tables,
    ga: &mut AdjustStateColorGroup,
    gb: &mut AdjustStateColorGroup,
) -> i32 {
    gb.reset();
    gb.init(&elem.b, water, tables);

    let stop_b = gb.best(water);
    if stop_b >= water {
        return water;
    }

    ga.reset();
    ga.init(&elem.a, water - stop_b, tables);

    for qa in 0..8usize {
        for qb in 0..8usize {
            let best_b = gb.best(water);
            let best_a = ga.best(water - best_b);
            if best_a + best_b >= water {
                return water;
            }

            if best_a.max(ga.s[qa].stop) + best_b >= water {
                break;
            }
            if best_a.max(ga.s[qa].stop) + gb.s[qb].stop >= water {
                continue;
            }

            let error = adjust_colors53(
                elem,
                &mut s.a,
                &mut s.b,
                water,
                qa,
                qb,
                &mut ga.s[qa],
                &mut gb.s[qb],
                best_a,
                best_b,
            );

            if water > error {
                water = error;
                s.qa = qa;
                s.qb = qb;
                s.mode = mode;
            }
        }
        ga.s[qa].stop = water;
    }

    water
}

// ── compute_table_color: SSIM-based index selection ──────────────────────────
//
// Mirrors `ComputeTableColor()` (C++ line 3946).

fn compute_table_color(half: &Half, color: &[u8], q: usize, index: &mut u32) {
    let half_size = half.count as usize;
    if half_size == 0 {
        return;
    }

    let q0 = G_TABLE[q][0];
    let q1 = G_TABLE[q][1];

    let c = [color[0] as i32, color[1] as i32, color[2] as i32];

    // 4-entry palette
    let vals: [[i32; 4]; 4] = [
        [sat_add_u8(c[0], q0), sat_add_u8(c[1], q0), sat_add_u8(c[2], q0), 0],
        [sat_add_u8(c[0], q1), sat_add_u8(c[1], q1), sat_add_u8(c[2], q1), 0],
        [sat_sub_u8(c[0], q0), sat_sub_u8(c[1], q0), sat_sub_u8(c[2], q0), 0],
        [sat_sub_u8(c[0], q1), sat_sub_u8(c[1], q1), sat_sub_u8(c[2], q1), 0],
    ];

    // Determine "good" mask: eliminate duplicate entries
    let mut good = 0xFu32;
    if vals[0][0] == vals[1][0] && vals[0][1] == vals[1][1] && vals[0][2] == vals[1][2] {
        good &= !2;
    }
    if vals[2][0] == vals[3][0] && vals[2][1] == vals[3][1] && vals[2][2] == vals[3][2] {
        good &= !8;
    }

    // For each pixel, compute which palette entries tie for minimum error (SIMD)
    let vg = i32x4::new([vals[0][0], vals[1][0], vals[2][0], vals[3][0]]);
    let vr = i32x4::new([vals[0][1], vals[1][1], vals[2][1], vals[3][1]]);
    let vb = i32x4::new([vals[0][2], vals[1][2], vals[2][2], vals[3][2]]);
    let wg = i32x4::splat(K_GREEN);
    let wr = i32x4::splat(K_RED);
    let wb = i32x4::splat(K_BLUE);

    let mut ways = [0u32; 8];
    for i in 0..half_size {
        let px = &half.data[i * 4..];
        let g = i32x4::splat(px[0]);
        let r = i32x4::splat(px[1]);
        let b = i32x4::splat(px[2]);

        let dg = vg - g;
        let dr = vr - r;
        let db = vb - b;
        let err = dg * dg * wg + dr * dr * wr + db * db * wb;

        let errs = err.to_array();
        let min_err = errs[0].min(errs[1]).min(errs[2]).min(errs[3]);
        let mut way = 0u32;
        for e in 0..4 {
            if errs[e] == min_err {
                way |= 1 << e;
            }
        }
        ways[i] = (way & good) | (1 << 4);
    }

    // Initialize loops to first valid choice per pixel
    let mut loops = [0usize; 8];
    for i in 0..half_size {
        let mut k = 0;
        while (ways[i] & (1 << k)) == 0 {
            k += 1;
        }
        loops[i] = k;
    }

    let mut best = -(K_COLOR as f64 + 0.1);
    let mut codes = 0u32;

    loop {
        // Compute SSIM for current assignment
        let mut accum = SsimAccum::new();
        for i in 0..half_size {
            let mt = vals[loops[i]];
            let mb = [
                half.data[i * 4],
                half.data[i * 4 + 1],
                half.data[i * 4 + 2],
                half.data[i * 4 + 3],
            ];
            accum.update(mt, mb);
        }

        let closed = accum.close(3);
        let [ssim_g, ssim_r] = closed.final_pair(0, 1, G_SSIM_8K1L, G_SSIM_8K2L);
        let other = closed.other();
        let [ssim_b, _] = other.final_pair(0, 1, G_SSIM_8K1L, G_SSIM_8K2L);

        let ssim = ssim_g * K_GREEN as f64 + ssim_r * K_RED as f64 + ssim_b * K_BLUE as f64;

        if best < ssim {
            best = ssim;

            let mut v = 0u32;
            for j in 0..half_size {
                v |= (loops[j] as u32) << (j + j);
            }
            codes = v;

            if best >= K_COLOR as f64 {
                break;
            }
        }

        // Advance to next assignment (odometer pattern)
        let mut i = 0;
        loop {
            let k = loops[i];
            if ways[i] != (1 << k) {
                let mut nk = k + 1;
                while nk < 4 && (ways[i] & (1 << nk)) == 0 {
                    nk += 1;
                }
                if nk < 4 {
                    loops[i] = nk;
                    break;
                }
                // Reset to first valid choice
                let mut first = 0;
                while (ways[i] & (1 << first)) == 0 {
                    first += 1;
                }
                loops[i] = first;
            }
            i += 1;
            if i >= half_size {
                break;
            }
        }
        if i >= half_size {
            break;
        }
    }

    // Encode codes into the 32-bit index
    for j in 0..half_size {
        let shift = half.shift[j] as u32;
        let code = ((codes & 2) << (16 - 1)) | (codes & 1);
        *index |= code << shift;
        codes >>= 2;
    }
}

// ── compare_blocks_color: weighted MSE between two 4×4 blocks ────────────────
//
// Mirrors `CompareBlocksColor()` (C++ line 2355).

fn compare_blocks_color(
    cell1: &[u8],
    stride1: usize,
    cell2: &[u8],
    stride2: usize,
) -> i32 {
    let mut err_g = 0i32;
    let mut err_r = 0i32;
    let mut err_b = 0i32;

    for y in 0..4 {
        for x in 0..4 {
            let off1 = y * stride1 + x * 4;
            if cell1[off1 + 3] != 0 {
                let off2 = y * stride2 + x * 4;
                let db = cell1[off1] as i32 - cell2[off2] as i32;
                let dg = cell1[off1 + 1] as i32 - cell2[off2 + 1] as i32;
                let dr = cell1[off1 + 2] as i32 - cell2[off2 + 2] as i32;
                err_b += db * db;
                err_g += dg * dg;
                err_r += dr * dr;
            }
        }
    }

    err_g * K_GREEN + err_r * K_RED + err_b * K_BLUE
}

// ── compress_block_color: top-level I+D encoder ──────────────────────────────
//
// Mirrors `CompressBlockColor()` (C++ line 4527).

fn compress_block_color(
    output: &mut [u8; 8],
    cell: &[u8],
    stride: usize,
    input_error: i32,
    ga: &mut AdjustStateColorGroup,
    gb: &mut AdjustStateColorGroup,
) -> i32 {
    let tables = Tables::global();

    let mut norm = Elem::default();
    let mut flip = Elem::default();

    // Load 4×4 block into norm and flip layouts.
    // norm: A = left 2 columns, B = right 2 columns (vertical split)
    // flip: A = top 2 rows, B = bottom 2 rows (horizontal split)
    //
    // C++ layout (line 4534):
    //   Row 0: c00→flip.A[0],norm.A[0]  c01→flip.A[4],norm.A[4]
    //          c02→flip.A[8],norm.B[0]  c03→flip.A[12],norm.B[4]
    //   Row 1: c10→flip.A[16],norm.A[8] c11→flip.A[20],norm.A[12]
    //          c12→flip.A[24],norm.B[8] c13→flip.A[28],norm.B[12]
    //   Row 2: c20→flip.B[0],norm.A[16] c21→flip.B[4],norm.A[20]
    //          c22→flip.B[8],norm.B[16] c23→flip.B[12],norm.B[20]
    //   Row 3: c30→flip.B[16],norm.A[24] c31→flip.B[20],norm.A[28]
    //          c32→flip.B[24],norm.B[24] c33→flip.B[28],norm.B[28]

    for row in 0..4 {
        for col in 0..4 {
            let src_off = row * stride + col * 4;
            let pix = load_color_bgra(&cell[src_off..]);

            // flip: A = top 2 rows, B = bottom 2 rows
            let flip_half = if row < 2 { &mut flip.a } else { &mut flip.b };
            let flip_idx = ((row & 1) * 4 + col) * 4;
            for ch in 0..4 {
                flip_half.data[flip_idx + ch] = pix[ch];
            }

            // norm: A = left 2 columns, B = right 2 columns
            let norm_half = if col < 2 { &mut norm.a } else { &mut norm.b };
            let norm_idx = (row * 2 + (col & 1)) * 4;
            for ch in 0..4 {
                norm_half.data[norm_idx + ch] = pix[ch];
            }
        }
    }

    // FilterPixelsColor with the appropriate shift orders
    filter_pixels_color(&mut norm.a, 0x73625140u32);
    filter_pixels_color(&mut norm.b, 0x73625140u32.wrapping_add(0x88888888u32));

    filter_pixels_color(&mut flip.a, 0xD951C840u32);
    filter_pixels_color(&mut flip.b, 0xD951C840u32.wrapping_add(0x22222222u32));

    // DeriveData (for SSIM in compute_table_color)
    derive_data_half(&mut norm.a);
    derive_data_half(&mut norm.b);
    derive_data_half(&mut flip.a);
    derive_data_half(&mut flip.b);

    let mut s = BlockStateColor::new();
    let mut err = input_error;

    if err > 0 {
        let d_norm = estimate_chroma_dispersion(&norm.a) + estimate_chroma_dispersion(&norm.b);
        let d_flip = estimate_chroma_dispersion(&flip.a) + estimate_chroma_dispersion(&flip.b);

        if d_norm <= d_flip {
            // norm first
            let err_norm44 = compress_block_color44(&mut s, &norm, err, 0, tables);
            if err > err_norm44 {
                err = err_norm44;
            }
            if err > 0 {
                let err_flip44 = compress_block_color44(&mut s, &flip, err, 1, tables);
                if err > err_flip44 {
                    err = err_flip44;
                }
                if err > 0 {
                    let err_norm53 = compress_block_color53(&mut s, &norm, err, 2, tables, ga, gb);
                    if err > err_norm53 {
                        err = err_norm53;
                    }
                    if err > 0 {
                        let err_flip53 = compress_block_color53(&mut s, &flip, err, 3, tables, ga, gb);
                        if err > err_flip53 {
                            err = err_flip53;
                        }
                    }
                }
            }
        } else {
            // flip first
            let err_flip44 = compress_block_color44(&mut s, &flip, err, 1, tables);
            if err > err_flip44 {
                err = err_flip44;
            }
            if err > 0 {
                let err_norm44 = compress_block_color44(&mut s, &norm, err, 0, tables);
                if err > err_norm44 {
                    err = err_norm44;
                }
                if err > 0 {
                    let err_flip53 = compress_block_color53(&mut s, &flip, err, 3, tables, ga, gb);
                    if err > err_flip53 {
                        err = err_flip53;
                    }
                    if err > 0 {
                        let err_norm53 = compress_block_color53(&mut s, &norm, err, 2, tables, ga, gb);
                        if err > err_norm53 {
                            err = err_norm53;
                        }
                    }
                }
            }
        }
    }

    if input_error > err {
        let mut block_index = 0u32;

        let f = (s.mode & 1) != 0;
        let (chosen_a, chosen_b) = if f {
            (&flip.a, &flip.b)
        } else {
            (&norm.a, &norm.b)
        };

        compute_table_color(chosen_a, &s.a, s.qa, &mut block_index);
        compute_table_color(chosen_b, &s.b, s.qb, &mut block_index);

        if (s.mode & 2) != 0 {
            // Differential mode encoding
            output[0] = ((s.a[1] & 0xF8) ^ (((s.b[1] >> 3).wrapping_sub(s.a[1] >> 3)) & 7)) as u8;
            output[1] = ((s.a[0] & 0xF8) ^ (((s.b[0] >> 3).wrapping_sub(s.a[0] >> 3)) & 7)) as u8;
            output[2] = ((s.a[2] & 0xF8) ^ (((s.b[2] >> 3).wrapping_sub(s.a[2] >> 3)) & 7)) as u8;
        } else {
            // Individual mode encoding
            output[0] = (s.a[1] & 0xF0) ^ (s.b[1] & 0x0F);
            output[1] = (s.a[0] & 0xF0) ^ (s.b[0] & 0x0F);
            output[2] = (s.a[2] & 0xF0) ^ (s.b[2] & 0x0F);
        }

        output[3] = ((s.qa << 5) ^ (s.qb << 2) ^ s.mode as usize) as u8;

        let swapped = bswap(block_index);
        output[4..8].copy_from_slice(&swapped.to_le_bytes());
    }

    err
}

// ── pack_color: texture-level loop ───────────────────────────────────────────
//
// Returns (mse_sum, ssim_sum).

pub fn pack_color(
    bgra: &mut [u8],
    tex_w: usize,
    tex_h: usize,
    etc2_buf: &mut [u8],
) -> (i64, f64) {
    let stride = tex_w * 4;
    let blocks_x = tex_w / 4;
    let blocks_y = tex_h / 4;
    let num_blocks = blocks_x * blocks_y;

    // Raw pointers as usize for Send/Sync in parallel closures.
    // SAFETY: each block accesses a non-overlapping 8-byte region of etc2_buf
    // and reads from a non-overlapping region of bgra.
    let bgra_addr = bgra.as_ptr() as usize;
    let etc2_addr = etc2_buf.as_mut_ptr() as usize;

    let compress_one = move |block_idx: usize,
                             ga: &mut Box<AdjustStateColorGroup>,
                             gb: &mut Box<AdjustStateColorGroup>|
     -> (i64, f64) {
        let by = block_idx / blocks_x;
        let bx = block_idx % blocks_x;
        let cell_off = (by * 4 * tex_w + bx * 4) * 4;
        let etc2_off = block_idx * 16 + 8;

        let output = unsafe { std::slice::from_raw_parts_mut((etc2_addr as *mut u8).add(etc2_off), 8) };
        let cell = unsafe { std::slice::from_raw_parts((bgra_addr as *const u8).add(cell_off), stride * 3 + 16) };

        let mut temp = [0u8; 64];
        let input_arr: [u8; 8] = output[..8].try_into().unwrap();
        crate::etc2::decompress::decompress_block_color_enhanced(&input_arr, &mut temp, 16);

        let input_error = compare_blocks_color(cell, stride, &temp, 16);

        if input_error > 0 {
            let out: &mut [u8; 8] = output.try_into().unwrap();
            let mut err = compress_block_color(out, cell, stride, input_error, ga, gb);

            if err > 0 {
                let err_enh = crate::etc2::compress_color_enhanced::compress_block_color_enhanced(
                    out, cell, stride, err,
                );
                if err > err_enh {
                    err = err_enh;
                }
            }

            let mse = err as i64;
            crate::etc2::decompress::decompress_block_color_enhanced(out, &mut temp, 16);
            let ssim = crate::etc2::ssim::compare_blocks_color_ssim(cell, stride, &temp, 16);
            (mse, ssim)
        } else {
            (0, 1.0)
        }
    };

    #[cfg(not(target_arch = "wasm32"))]
    let (mse, ssim) = {
        use rayon::prelude::*;
        use std::cell::RefCell;

        // Thread-local ga/gb: allocated once per rayon thread, reused across blocks.
        thread_local! {
            static TL_GA: RefCell<Option<Box<AdjustStateColorGroup>>> = const { RefCell::new(None) };
            static TL_GB: RefCell<Option<Box<AdjustStateColorGroup>>> = const { RefCell::new(None) };
        }

        (0..num_blocks)
            .into_par_iter()
            .map(|block_idx| {
                TL_GA.with(|ga_cell| {
                    TL_GB.with(|gb_cell| {
                        let mut ga_ref = ga_cell.borrow_mut();
                        let mut gb_ref = gb_cell.borrow_mut();
                        let ga = ga_ref.get_or_insert_with(AdjustStateColorGroup::new);
                        let gb = gb_ref.get_or_insert_with(AdjustStateColorGroup::new);
                        compress_one(block_idx, ga, gb)
                    })
                })
            })
            .reduce(|| (0, 0.0), |(m1, s1), (m2, s2)| (m1 + m2, s1 + s2))
    };

    #[cfg(target_arch = "wasm32")]
    let (mse, ssim) = {
        let mut ga = AdjustStateColorGroup::new();
        let mut gb = AdjustStateColorGroup::new();
        let mut mse = 0i64;
        let mut ssim = 0.0f64;
        for block_idx in 0..num_blocks {
            let (dm, ds) = compress_one(block_idx, &mut ga, &mut gb);
            mse += dm;
            ssim += ds;
        }
        (mse, ssim)
    };

    // Decompress colour back into bgra buffer
    crate::etc2::decompress::decompress_color_texture(etc2_buf, bgra, tex_w as u32, tex_h as u32);

    (mse, ssim)
}

/// Create a pre-allocated `AdjustStateColorGroup` for reuse across blocks.
/// Exposed for the WASM API to avoid per-block allocation overhead.
pub fn new_adjust_group() -> Box<AdjustStateColorGroup> {
    AdjustStateColorGroup::new()
}

/// Compress a single 4×4 color block from flat BGRA data (64 bytes, stride=16).
///
/// Returns `(mse, ssim)` — the MSE and SSIM for this block.
/// Writes 8 bytes of ETC2 color data to `output`.
///
/// Unlike `pack_color`, this has no warm-start (always compresses from scratch).
pub fn compress_block_color_from_raw(
    output: &mut [u8; 8],
    bgra_block: &[u8],
    ga: &mut Box<AdjustStateColorGroup>,
    gb: &mut Box<AdjustStateColorGroup>,
) -> (i32, f64) {
    let stride = 16; // 4 pixels × 4 bytes

    let mut err = compress_block_color(output, bgra_block, stride, i32::MAX, ga, gb);

    // Try T/H/Planar enhanced modes
    if err > 0 {
        let err_enh = crate::etc2::compress_color_enhanced::compress_block_color_enhanced(
            output,
            bgra_block,
            stride,
            err,
        );
        if err > err_enh {
            err = err_enh;
        }
    }

    let mse = err;

    // Compute SSIM: decompress and compare
    let ssim = if mse > 0 {
        let mut temp = [0u8; 64];
        crate::etc2::decompress::decompress_block_color_enhanced(output, &mut temp, stride);
        crate::etc2::ssim::compare_blocks_color_ssim(bgra_block, stride, &temp, stride)
    } else {
        1.0
    };

    (mse, ssim)
}

#[cfg(test)]
mod wasm_api_tests {
    use super::*;
    use crate::etc2::compress_alpha;
    use crate::etc2::decompress;
    use crate::etc2::ssim;
    use crate::etc2::tables::Tables;

    /// Exercise the exact code path used by etc2_compress_chunk in WASM.
    #[test]
    fn compress_chunk_pipeline_single_block() {
        Tables::init();

        // Create a test block: 64 bytes BGRA + 16 bytes alpha = 80 bytes
        let mut block = [0u8; 80];

        // Fill BGRA with a simple gradient pattern
        for row in 0..4usize {
            for col in 0..4usize {
                let p = (row * 4 + col) * 4;
                block[p] = (col * 64) as u8;       // B
                block[p + 1] = (row * 64) as u8;   // G
                block[p + 2] = 128;                 // R
                block[p + 3] = 255;                 // A (mask = opaque)
            }
        }
        // Fill alpha values
        for i in 0..16 {
            block[64 + i] = (i * 16) as u8;
        }

        let bgra_masked = &block[0..64];
        let orig_alpha = &block[64..80];

        // --- Alpha compression (same as wasm_api) ---
        let mut alpha_etc2 = [0u8; 8];
        let _alpha_mse = compress_alpha::compress_block_alpha_from_raw(
            &mut alpha_etc2,
            orig_alpha,
        );

        // Decompress alpha for SSIM
        let mut decomp_alpha = [0u8; 64];
        decompress::decompress_block_alpha(&alpha_etc2, &mut decomp_alpha, 16);

        // Compute alpha SSIM
        let mut orig_alpha_bgra = [0u8; 64];
        for p in 0..16 {
            orig_alpha_bgra[p * 4 + 3] = orig_alpha[p];
        }
        let _alpha_ssim = ssim::compare_blocks_alpha_ssim(
            &orig_alpha_bgra, 16,
            &decomp_alpha, 16,
        );

        // --- Color compression (same as wasm_api) ---
        let mut ga = new_adjust_group();
        let mut gb = new_adjust_group();
        let mut color_etc2 = [0u8; 8];
        let (color_mse, color_ssim) = compress_block_color_from_raw(
            &mut color_etc2,
            bgra_masked,
            &mut ga,
            &mut gb,
        );

        assert!(color_mse >= 0, "color MSE must be non-negative");
        assert!(color_ssim >= 0.0 && color_ssim <= 1.0,
            "color SSIM must be in [0,1], got {color_ssim}");
    }

    /// Full pipeline test using a compact sprite-like RGBA fixture.
    #[test]
    fn compress_chunk_pipeline_real_image() {
        Tables::init();

        // This deterministic fixture covers opaque, translucent, and fully
        // transparent pixels without requiring a demo PNG in the algorithm package.
        let w = 8u32;
        let h = 8u32;
        let mut raw_bgra = vec![0u8; (w * h * 4) as usize];
        for y in 0..h {
            for x in 0..w {
                let pixel = ((y * w + x) * 4) as usize;
                raw_bgra[pixel] = (x * 31) as u8;
                raw_bgra[pixel + 1] = (y * 31) as u8;
                raw_bgra[pixel + 2] = ((x + y) * 16) as u8;
                raw_bgra[pixel + 3] = match (x + y) % 3 { 0 => 0, 1 => 128, _ => 255 };
            }
        }
        for pixel in raw_bgra.chunks_exact_mut(4) {
            pixel.swap(0, 2); // RGBA → BGRA expected by the ETC2 encoder
        }

        let tex_w = ((w.max(1) + 3) / 4 * 4) as u32;
        let tex_h = ((h.max(1) + 3) / 4 * 4) as u32;
        let tw = tex_w as usize;
        let th = tex_h as usize;

        // Pad
        let padded = crate::shared::texture::pad_to_texture(&raw_bgra, w, h, tex_w, tex_h);

        // Save original alpha
        let original_alpha: Vec<u8> = (0..tw * th)
            .map(|i| padded[i * 4 + 3])
            .collect();

        // Apply mask
        let mut color_buf = padded.clone();
        let border = 1;
        crate::shared::texture::outline_alpha(&mut color_buf, tex_w, tex_h, border);

        // Extract blocks (same as etc2_prepare)
        let blocks_x = tw / 4;
        let blocks_y = th / 4;
        let num_blocks = blocks_x * blocks_y;
        let stride = tw * 4;

        let mut block_data = Vec::with_capacity(num_blocks * 80);
        for by in 0..blocks_y {
            for bx in 0..blocks_x {
                for row in 0..4 {
                    let src = ((by * 4 + row) * stride) + bx * 4 * 4;
                    block_data.extend_from_slice(&color_buf[src..src + 16]);
                }
                for row in 0..4 {
                    for col in 0..4 {
                        let pixel = (by * 4 + row) * tw + (bx * 4 + col);
                        block_data.push(original_alpha[pixel]);
                    }
                }
            }
        }

        assert_eq!(block_data.len(), num_blocks * 80);

        // Compress all blocks (same as etc2_compress_chunk)
        let mut ga = new_adjust_group();
        let mut gb = new_adjust_group();

        for i in 0..num_blocks {
            let block = &block_data[i * 80..(i + 1) * 80];
            let bgra_masked = &block[0..64];
            let orig_alpha = &block[64..80];

            let mut alpha_etc2 = [0u8; 8];
            compress_alpha::compress_block_alpha_from_raw(
                &mut alpha_etc2,
                orig_alpha,
            );

            let mut color_etc2 = [0u8; 8];
            compress_block_color_from_raw(
                &mut color_etc2,
                bgra_masked,
                &mut ga,
                &mut gb,
            );
        }

        eprintln!("compressed {num_blocks} blocks successfully");
    }
}
