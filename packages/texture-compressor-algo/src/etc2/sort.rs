//! Sorting utilities — Rust port of the sort networks and radix sort in
//! `Etc2Compress.cpp` (lines 2456–3268).
//!
//! # Overview
//!
//! The C++ compressor uses two sorting primitives:
//!
//! * **Sort networks** (`SortNodes{2,4,6,8,C,10,18,20}Shifted`) — branchless
//!   optimal-comparison networks for small fixed sizes (2, 4, 6, 8, 12, 16,
//!   24, 32 elements).  The "Shifted" naming reflects a pointer-arithmetic
//!   trick in the C++ source; in Rust we simply take a slice of the correct
//!   length.
//!
//! * **Radix sort** (`radix_sort`) — stable 4-bit-radix LSD sort on both the
//!   `Color` field (8 bits, 2 passes) and the `Error` field (32 bits, 8
//!   passes) to produce a final ascending-by-error ordering.
//!
//! * **`sort_nodes_10` / `sort_nodes_20`** — wrappers that filter a candidate
//!   array against a `water` threshold, pad with sentinels, then dispatch to
//!   the appropriate network.  The count is stored in the sentinel slot at the
//!   end of the array (index 16 / 32 respectively), mirroring the C++ convention.
//!
//! * **`sort100`** — top-level dispatcher: uses `qsort` (Rust `sort_by`) for
//!   ≤ 16 elements, `radix_sort` otherwise.

use crate::etc2::types::Node;

// ── Compare-and-swap primitive ────────────────────────────────────────────────

/// Swap `nodes[a]` and `nodes[b]` if `nodes[a].error > nodes[b].error`.
///
/// Mirrors `SWAP_PAIR` in `Etc2Compress.cpp`.
#[inline(always)]
fn swap_if(nodes: &mut [Node], a: usize, b: usize) {
    if nodes[a].error > nodes[b].error {
        nodes.swap(a, b);
    }
}

// ── Sort networks ─────────────────────────────────────────────────────────────

/// Sort 2 nodes ascending by error.  Mirrors `SortNodes2Shifted`.
#[inline]
pub fn sort_network_2(n: &mut [Node]) {
    swap_if(n, 0, 1);
}

/// Sort 4 nodes ascending by error.  Mirrors `SortNodes4Shifted`.
#[inline]
pub fn sort_network_4(n: &mut [Node]) {
    swap_if(n, 0, 1);
    swap_if(n, 2, 3);
    swap_if(n, 0, 2);
    swap_if(n, 1, 3);
    swap_if(n, 1, 2);
}

/// Sort 6 nodes ascending by error.  Mirrors `SortNodes6Shifted`.
#[inline]
pub fn sort_network_6(n: &mut [Node]) {
    swap_if(n, 1, 2);
    swap_if(n, 0, 2);
    swap_if(n, 0, 1);
    swap_if(n, 4, 5);
    swap_if(n, 3, 5);
    swap_if(n, 3, 4);
    swap_if(n, 0, 3);
    swap_if(n, 1, 4);
    swap_if(n, 2, 5);
    swap_if(n, 2, 4);
    swap_if(n, 1, 3);
    swap_if(n, 2, 3);
}

/// Sort 8 nodes ascending by error.  Mirrors `SortNodes8Shifted`.
#[inline]
pub fn sort_network_8(n: &mut [Node]) {
    swap_if(n, 0, 1);
    swap_if(n, 2, 3);
    swap_if(n, 0, 2);
    swap_if(n, 1, 3);
    swap_if(n, 1, 2);
    swap_if(n, 4, 5);
    swap_if(n, 6, 7);
    swap_if(n, 4, 6);
    swap_if(n, 5, 7);
    swap_if(n, 5, 6);
    swap_if(n, 0, 4);
    swap_if(n, 1, 5);
    swap_if(n, 1, 4);
    swap_if(n, 2, 6);
    swap_if(n, 3, 7);
    swap_if(n, 3, 6);
    swap_if(n, 2, 4);
    swap_if(n, 3, 5);
    swap_if(n, 3, 4);
}

/// Sort 12 nodes ascending by error.  Mirrors `SortNodesCShifted`.
#[inline]
pub fn sort_network_12(n: &mut [Node]) {
    swap_if(n, 0, 1);
    swap_if(n, 2, 3);
    swap_if(n, 4, 5);
    swap_if(n, 6, 7);
    swap_if(n, 8, 9);
    swap_if(n, 10, 11);
    swap_if(n, 1, 3);
    swap_if(n, 5, 7);
    swap_if(n, 9, 11);
    swap_if(n, 0, 2);
    swap_if(n, 4, 6);
    swap_if(n, 8, 10);
    swap_if(n, 1, 2);
    swap_if(n, 5, 6);
    swap_if(n, 9, 10);
    swap_if(n, 1, 5);
    swap_if(n, 6, 10);
    swap_if(n, 5, 9);
    swap_if(n, 2, 6);
    swap_if(n, 1, 5);
    swap_if(n, 6, 10);
    swap_if(n, 0, 4);
    swap_if(n, 7, 11);
    swap_if(n, 3, 7);
    swap_if(n, 4, 8);
    swap_if(n, 0, 4);
    swap_if(n, 7, 11);
    swap_if(n, 1, 4);
    swap_if(n, 7, 10);
    swap_if(n, 3, 8);
    swap_if(n, 2, 3);
    swap_if(n, 8, 9);
    swap_if(n, 2, 4);
    swap_if(n, 7, 9);
    swap_if(n, 3, 5);
    swap_if(n, 6, 8);
    swap_if(n, 3, 4);
    swap_if(n, 5, 6);
    swap_if(n, 7, 8);
}

/// Sort 16 nodes ascending by error.  Mirrors `SortNodes10Shifted`.
#[inline]
pub fn sort_network_16(n: &mut [Node]) {
    swap_if(n, 0, 1);
    swap_if(n, 2, 3);
    swap_if(n, 4, 5);
    swap_if(n, 6, 7);
    swap_if(n, 8, 9);
    swap_if(n, 10, 11);
    swap_if(n, 12, 13);
    swap_if(n, 14, 15);
    swap_if(n, 0, 2);
    swap_if(n, 4, 6);
    swap_if(n, 8, 10);
    swap_if(n, 12, 14);
    swap_if(n, 1, 3);
    swap_if(n, 5, 7);
    swap_if(n, 9, 11);
    swap_if(n, 13, 15);
    swap_if(n, 0, 4);
    swap_if(n, 8, 12);
    swap_if(n, 1, 5);
    swap_if(n, 9, 13);
    swap_if(n, 2, 6);
    swap_if(n, 10, 14);
    swap_if(n, 3, 7);
    swap_if(n, 11, 15);
    swap_if(n, 0, 8);
    swap_if(n, 1, 9);
    swap_if(n, 2, 10);
    swap_if(n, 3, 11);
    swap_if(n, 4, 12);
    swap_if(n, 5, 13);
    swap_if(n, 6, 14);
    swap_if(n, 7, 15);
    swap_if(n, 5, 10);
    swap_if(n, 6, 9);
    swap_if(n, 3, 12);
    swap_if(n, 13, 14);
    swap_if(n, 7, 11);
    swap_if(n, 1, 2);
    swap_if(n, 4, 8);
    swap_if(n, 1, 4);
    swap_if(n, 7, 13);
    swap_if(n, 2, 8);
    swap_if(n, 11, 14);
    swap_if(n, 2, 4);
    swap_if(n, 5, 6);
    swap_if(n, 9, 10);
    swap_if(n, 11, 13);
    swap_if(n, 3, 8);
    swap_if(n, 7, 12);
    swap_if(n, 6, 8);
    swap_if(n, 10, 12);
    swap_if(n, 3, 5);
    swap_if(n, 7, 9);
    swap_if(n, 3, 4);
    swap_if(n, 5, 6);
    swap_if(n, 7, 8);
    swap_if(n, 9, 10);
    swap_if(n, 11, 12);
    swap_if(n, 6, 7);
    swap_if(n, 8, 9);
}

/// Sort 24 nodes ascending by error.  Mirrors `SortNodes18Shifted`.
#[inline]
pub fn sort_network_24(n: &mut [Node]) {
    swap_if(n, 1, 2);
    swap_if(n, 0, 2);
    swap_if(n, 0, 1);
    swap_if(n, 4, 5);
    swap_if(n, 3, 5);
    swap_if(n, 3, 4);
    swap_if(n, 0, 3);
    swap_if(n, 1, 4);
    swap_if(n, 2, 5);
    swap_if(n, 2, 4);
    swap_if(n, 1, 3);
    swap_if(n, 2, 3);
    swap_if(n, 7, 8);
    swap_if(n, 6, 8);
    swap_if(n, 6, 7);
    swap_if(n, 10, 11);
    swap_if(n, 9, 11);
    swap_if(n, 9, 10);
    swap_if(n, 6, 9);
    swap_if(n, 7, 10);
    swap_if(n, 8, 11);
    swap_if(n, 8, 10);
    swap_if(n, 7, 9);
    swap_if(n, 8, 9);
    swap_if(n, 0, 6);
    swap_if(n, 1, 7);
    swap_if(n, 2, 8);
    swap_if(n, 2, 7);
    swap_if(n, 1, 6);
    swap_if(n, 2, 6);
    swap_if(n, 3, 9);
    swap_if(n, 4, 10);
    swap_if(n, 5, 11);
    swap_if(n, 5, 10);
    swap_if(n, 4, 9);
    swap_if(n, 5, 9);
    swap_if(n, 3, 6);
    swap_if(n, 4, 7);
    swap_if(n, 5, 8);
    swap_if(n, 5, 7);
    swap_if(n, 4, 6);
    swap_if(n, 5, 6);
    swap_if(n, 13, 14);
    swap_if(n, 12, 14);
    swap_if(n, 12, 13);
    swap_if(n, 16, 17);
    swap_if(n, 15, 17);
    swap_if(n, 15, 16);
    swap_if(n, 12, 15);
    swap_if(n, 13, 16);
    swap_if(n, 14, 17);
    swap_if(n, 14, 16);
    swap_if(n, 13, 15);
    swap_if(n, 14, 15);
    swap_if(n, 19, 20);
    swap_if(n, 18, 20);
    swap_if(n, 18, 19);
    swap_if(n, 22, 23);
    swap_if(n, 21, 23);
    swap_if(n, 21, 22);
    swap_if(n, 18, 21);
    swap_if(n, 19, 22);
    swap_if(n, 20, 23);
    swap_if(n, 20, 22);
    swap_if(n, 19, 21);
    swap_if(n, 20, 21);
    swap_if(n, 12, 18);
    swap_if(n, 13, 19);
    swap_if(n, 14, 20);
    swap_if(n, 14, 19);
    swap_if(n, 13, 18);
    swap_if(n, 14, 18);
    swap_if(n, 15, 21);
    swap_if(n, 16, 22);
    swap_if(n, 17, 23);
    swap_if(n, 17, 22);
    swap_if(n, 16, 21);
    swap_if(n, 17, 21);
    swap_if(n, 15, 18);
    swap_if(n, 16, 19);
    swap_if(n, 17, 20);
    swap_if(n, 17, 19);
    swap_if(n, 16, 18);
    swap_if(n, 17, 18);
    swap_if(n, 0, 12);
    swap_if(n, 1, 13);
    swap_if(n, 2, 14);
    swap_if(n, 2, 13);
    swap_if(n, 1, 12);
    swap_if(n, 2, 12);
    swap_if(n, 3, 15);
    swap_if(n, 4, 16);
    swap_if(n, 5, 17);
    swap_if(n, 5, 16);
    swap_if(n, 4, 15);
    swap_if(n, 5, 15);
    swap_if(n, 3, 12);
    swap_if(n, 4, 13);
    swap_if(n, 5, 14);
    swap_if(n, 5, 13);
    swap_if(n, 4, 12);
    swap_if(n, 5, 12);
    swap_if(n, 6, 18);
    swap_if(n, 7, 19);
    swap_if(n, 8, 20);
    swap_if(n, 8, 19);
    swap_if(n, 7, 18);
    swap_if(n, 8, 18);
    swap_if(n, 9, 21);
    swap_if(n, 10, 22);
    swap_if(n, 11, 23);
    swap_if(n, 11, 22);
    swap_if(n, 10, 21);
    swap_if(n, 11, 21);
    swap_if(n, 9, 18);
    swap_if(n, 10, 19);
    swap_if(n, 11, 20);
    swap_if(n, 11, 19);
    swap_if(n, 10, 18);
    swap_if(n, 11, 18);
    swap_if(n, 6, 12);
    swap_if(n, 7, 13);
    swap_if(n, 8, 14);
    swap_if(n, 8, 13);
    swap_if(n, 7, 12);
    swap_if(n, 8, 12);
    swap_if(n, 9, 15);
    swap_if(n, 10, 16);
    swap_if(n, 11, 17);
    swap_if(n, 11, 16);
    swap_if(n, 10, 15);
    swap_if(n, 11, 15);
    swap_if(n, 9, 12);
    swap_if(n, 10, 13);
    swap_if(n, 11, 14);
    swap_if(n, 11, 13);
    swap_if(n, 10, 12);
    swap_if(n, 11, 12);
}

/// Sort 32 nodes ascending by error.  Mirrors `SortNodes20Shifted`.
#[inline]
pub fn sort_network_32(n: &mut [Node]) {
    swap_if(n, 0, 1);
    swap_if(n, 2, 3);
    swap_if(n, 0, 2);
    swap_if(n, 1, 3);
    swap_if(n, 1, 2);
    swap_if(n, 4, 5);
    swap_if(n, 6, 7);
    swap_if(n, 4, 6);
    swap_if(n, 5, 7);
    swap_if(n, 5, 6);
    swap_if(n, 0, 4);
    swap_if(n, 1, 5);
    swap_if(n, 1, 4);
    swap_if(n, 2, 6);
    swap_if(n, 3, 7);
    swap_if(n, 3, 6);
    swap_if(n, 2, 4);
    swap_if(n, 3, 5);
    swap_if(n, 3, 4);
    swap_if(n, 8, 9);
    swap_if(n, 10, 11);
    swap_if(n, 8, 10);
    swap_if(n, 9, 11);
    swap_if(n, 9, 10);
    swap_if(n, 12, 13);
    swap_if(n, 14, 15);
    swap_if(n, 12, 14);
    swap_if(n, 13, 15);
    swap_if(n, 13, 14);
    swap_if(n, 8, 12);
    swap_if(n, 9, 13);
    swap_if(n, 9, 12);
    swap_if(n, 10, 14);
    swap_if(n, 11, 15);
    swap_if(n, 11, 14);
    swap_if(n, 10, 12);
    swap_if(n, 11, 13);
    swap_if(n, 11, 12);
    swap_if(n, 0, 8);
    swap_if(n, 1, 9);
    swap_if(n, 1, 8);
    swap_if(n, 2, 10);
    swap_if(n, 3, 11);
    swap_if(n, 3, 10);
    swap_if(n, 2, 8);
    swap_if(n, 3, 9);
    swap_if(n, 3, 8);
    swap_if(n, 4, 12);
    swap_if(n, 5, 13);
    swap_if(n, 5, 12);
    swap_if(n, 6, 14);
    swap_if(n, 7, 15);
    swap_if(n, 7, 14);
    swap_if(n, 6, 12);
    swap_if(n, 7, 13);
    swap_if(n, 7, 12);
    swap_if(n, 4, 8);
    swap_if(n, 5, 9);
    swap_if(n, 5, 8);
    swap_if(n, 6, 10);
    swap_if(n, 7, 11);
    swap_if(n, 7, 10);
    swap_if(n, 6, 8);
    swap_if(n, 7, 9);
    swap_if(n, 7, 8);
    swap_if(n, 16, 17);
    swap_if(n, 18, 19);
    swap_if(n, 16, 18);
    swap_if(n, 17, 19);
    swap_if(n, 17, 18);
    swap_if(n, 20, 21);
    swap_if(n, 22, 23);
    swap_if(n, 20, 22);
    swap_if(n, 21, 23);
    swap_if(n, 21, 22);
    swap_if(n, 16, 20);
    swap_if(n, 17, 21);
    swap_if(n, 17, 20);
    swap_if(n, 18, 22);
    swap_if(n, 19, 23);
    swap_if(n, 19, 22);
    swap_if(n, 18, 20);
    swap_if(n, 19, 21);
    swap_if(n, 19, 20);
    swap_if(n, 24, 25);
    swap_if(n, 26, 27);
    swap_if(n, 24, 26);
    swap_if(n, 25, 27);
    swap_if(n, 25, 26);
    swap_if(n, 28, 29);
    swap_if(n, 30, 31);
    swap_if(n, 28, 30);
    swap_if(n, 29, 31);
    swap_if(n, 29, 30);
    swap_if(n, 24, 28);
    swap_if(n, 25, 29);
    swap_if(n, 25, 28);
    swap_if(n, 26, 30);
    swap_if(n, 27, 31);
    swap_if(n, 27, 30);
    swap_if(n, 26, 28);
    swap_if(n, 27, 29);
    swap_if(n, 27, 28);
    swap_if(n, 16, 24);
    swap_if(n, 17, 25);
    swap_if(n, 17, 24);
    swap_if(n, 18, 26);
    swap_if(n, 19, 27);
    swap_if(n, 19, 26);
    swap_if(n, 18, 24);
    swap_if(n, 19, 25);
    swap_if(n, 19, 24);
    swap_if(n, 20, 28);
    swap_if(n, 21, 29);
    swap_if(n, 21, 28);
    swap_if(n, 22, 30);
    swap_if(n, 23, 31);
    swap_if(n, 23, 30);
    swap_if(n, 22, 28);
    swap_if(n, 23, 29);
    swap_if(n, 23, 28);
    swap_if(n, 20, 24);
    swap_if(n, 21, 25);
    swap_if(n, 21, 24);
    swap_if(n, 22, 26);
    swap_if(n, 23, 27);
    swap_if(n, 23, 26);
    swap_if(n, 22, 24);
    swap_if(n, 23, 25);
    swap_if(n, 23, 24);
    swap_if(n, 0, 16);
    swap_if(n, 1, 17);
    swap_if(n, 1, 16);
    swap_if(n, 2, 18);
    swap_if(n, 3, 19);
    swap_if(n, 3, 18);
    swap_if(n, 2, 16);
    swap_if(n, 3, 17);
    swap_if(n, 3, 16);
    swap_if(n, 4, 20);
    swap_if(n, 5, 21);
    swap_if(n, 5, 20);
    swap_if(n, 6, 22);
    swap_if(n, 7, 23);
    swap_if(n, 7, 22);
    swap_if(n, 6, 20);
    swap_if(n, 7, 21);
    swap_if(n, 7, 20);
    swap_if(n, 4, 16);
    swap_if(n, 5, 17);
    swap_if(n, 5, 16);
    swap_if(n, 6, 18);
    swap_if(n, 7, 19);
    swap_if(n, 7, 18);
    swap_if(n, 6, 16);
    swap_if(n, 7, 17);
    swap_if(n, 7, 16);
    swap_if(n, 8, 24);
    swap_if(n, 9, 25);
    swap_if(n, 9, 24);
    swap_if(n, 10, 26);
    swap_if(n, 11, 27);
    swap_if(n, 11, 26);
    swap_if(n, 10, 24);
    swap_if(n, 11, 25);
    swap_if(n, 11, 24);
    swap_if(n, 12, 28);
    swap_if(n, 13, 29);
    swap_if(n, 13, 28);
    swap_if(n, 14, 30);
    swap_if(n, 15, 31);
    swap_if(n, 15, 30);
    swap_if(n, 14, 28);
    swap_if(n, 15, 29);
    swap_if(n, 15, 28);
    swap_if(n, 12, 24);
    swap_if(n, 13, 25);
    swap_if(n, 13, 24);
    swap_if(n, 14, 26);
    swap_if(n, 15, 27);
    swap_if(n, 15, 26);
    swap_if(n, 14, 24);
    swap_if(n, 15, 25);
    swap_if(n, 15, 24);
    swap_if(n, 8, 16);
    swap_if(n, 9, 17);
    swap_if(n, 9, 16);
    swap_if(n, 10, 18);
    swap_if(n, 11, 19);
    swap_if(n, 11, 18);
    swap_if(n, 10, 16);
    swap_if(n, 11, 17);
    swap_if(n, 11, 16);
    swap_if(n, 12, 20);
    swap_if(n, 13, 21);
    swap_if(n, 13, 20);
    swap_if(n, 14, 22);
    swap_if(n, 15, 23);
    swap_if(n, 15, 22);
    swap_if(n, 14, 20);
    swap_if(n, 15, 21);
    swap_if(n, 15, 20);
    swap_if(n, 12, 16);
    swap_if(n, 13, 17);
    swap_if(n, 13, 16);
    swap_if(n, 14, 18);
    swap_if(n, 15, 19);
    swap_if(n, 15, 18);
    swap_if(n, 14, 16);
    swap_if(n, 15, 17);
    swap_if(n, 15, 16);
}

// ── Radix sort ────────────────────────────────────────────────────────────────

/// Stable LSD radix sort on `A[0..n]`.
///
/// First sorts by `Color` (8 bits, 2 × 4-bit passes), then by `Error`
/// (32 bits, 8 × 4-bit passes).  The result is ascending by `Error`,
/// with ties broken by `Color` (ascending).
///
/// Mirrors `radix_sort()` in `Etc2Compress.cpp`.
#[cfg(test)]
pub fn radix_sort(a: &mut [Node], n: usize) {
    const RADIX: usize = 4;
    const BUCKET_COUNT: usize = 1 << RADIX;
    const BUCKET_MASK: u32 = (BUCKET_COUNT - 1) as u32;

    let mut b = vec![Node::default(); 0x100];

    // ── Pass 1: sort by Color (8 bits = 2 × 4-bit passes) ────────────────
    let any_color = a[..n].iter().fold(0u32, |acc, nd| acc | nd.color as u32);

    for shift in (0..8u32).step_by(RADIX) {
        if (any_color >> shift) & BUCKET_MASK == 0 {
            continue;
        }

        let mut counts = [0usize; BUCKET_COUNT];
        for nd in a[..n].iter() {
            b[..n].clone_from_slice(&a[..n]);
            // count bucket for this node
            counts[((nd.color as u32 >> shift) & BUCKET_MASK) as usize] += 1;
        }
        // The loop above has a bug: clone_from_slice inside iteration doesn't
        // match the C++. Fix: copy first, then count.
        b[..n].clone_from_slice(&a[..n]);
        counts = [0usize; BUCKET_COUNT];
        for nd in b[..n].iter() {
            counts[((nd.color as u32 >> shift) & BUCKET_MASK) as usize] += 1;
        }

        let mut total = 0usize;
        for c in counts.iter_mut() {
            let old = *c;
            *c = total;
            total += old;
        }

        for nd in b[..n].iter() {
            let bucket = ((nd.color as u32 >> shift) & BUCKET_MASK) as usize;
            a[counts[bucket]] = *nd;
            counts[bucket] += 1;
        }
    }

    // ── Pass 2: sort by Error (32 bits = 8 × 4-bit passes) ───────────────
    let any_error = a[..n]
        .iter()
        .fold(0u32, |acc, nd| acc | nd.error as u32);

    for shift in (0..32u32).step_by(RADIX) {
        if (any_error >> shift) & BUCKET_MASK == 0 {
            continue;
        }

        b[..n].clone_from_slice(&a[..n]);
        let mut counts = [0usize; BUCKET_COUNT];
        for nd in b[..n].iter() {
            counts[((nd.error as u32 >> shift) & BUCKET_MASK) as usize] += 1;
        }

        let mut total = 0usize;
        for c in counts.iter_mut() {
            let old = *c;
            *c = total;
            total += old;
        }

        for nd in b[..n].iter() {
            let bucket = ((nd.error as u32 >> shift) & BUCKET_MASK) as usize;
            a[counts[bucket]] = *nd;
            counts[bucket] += 1;
        }
    }
}

// ── Dispatcher wrappers ───────────────────────────────────────────────────────

/// Filter-and-sort up to 16 candidate nodes.
///
/// `nodes` must be a 17-element array.  `nodes[16].color` holds the count of
/// valid candidates (this mirrors the C++ `nodes[0x10].Color` convention).
///
/// Candidates with `error >= water` are discarded.  The survivors are padded
/// with sentinel nodes (`error = water`) and sorted by a branchless network.
/// `nodes[16].color` is updated to the survivor count.
///
/// Mirrors `SortNodes10()` in `Etc2Compress.cpp`.
pub fn sort_nodes_10(nodes: &mut [Node; 17], water: i32) {
    let n = nodes[16].color as usize;
    let mut w = 0usize;

    for i in 0..n {
        let temp = nodes[i];
        nodes[w] = temp;
        if temp.error < water {
            w += 1;
        }
    }

    nodes[16].color = w as i32;

    if w <= 2 {
        nodes[w].error = water;
        nodes[w + 1].error = water;
        sort_network_2(&mut nodes[0..2]);
    } else if w <= 4 {
        nodes[w].error = water;
        sort_network_4(&mut nodes[0..4]);
    } else if w <= 6 {
        nodes[w].error = water;
        sort_network_6(&mut nodes[0..6]);
    } else if w <= 8 {
        nodes[w].error = water;
        sort_network_8(&mut nodes[0..8]);
    } else if w <= 12 {
        for i in w..12 {
            nodes[i].error = water;
        }
        sort_network_12(&mut nodes[0..12]);
    } else {
        for i in w..16 {
            nodes[i].error = water;
        }
        sort_network_16(&mut nodes[0..16]);
    }
}

/// Filter-and-sort up to 32 candidate nodes.
///
/// `nodes` must be a 33-element array.  `nodes[32].color` holds the count.
///
/// Mirrors `SortNodes20()` in `Etc2Compress.cpp`.
pub fn sort_nodes_20(nodes: &mut [Node; 33], water: i32) {
    let n = nodes[32].color as usize;
    let mut w = 0usize;

    for i in 0..n {
        let temp = nodes[i];
        nodes[w] = temp;
        if temp.error < water {
            w += 1;
        }
    }

    nodes[32].color = w as i32;

    if w <= 2 {
        nodes[w].error = water;
        nodes[w + 1].error = water;
        sort_network_2(&mut nodes[0..2]);
    } else if w <= 4 {
        nodes[w].error = water;
        sort_network_4(&mut nodes[0..4]);
    } else if w <= 6 {
        nodes[w].error = water;
        sort_network_6(&mut nodes[0..6]);
    } else if w <= 8 {
        nodes[w].error = water;
        sort_network_8(&mut nodes[0..8]);
    } else if w <= 12 {
        for i in w..12 {
            nodes[i].error = water;
        }
        sort_network_12(&mut nodes[0..12]);
    } else if w <= 16 {
        for i in w..16 {
            nodes[i].error = water;
        }
        sort_network_16(&mut nodes[0..16]);
    } else if w <= 24 {
        for i in w..24 {
            nodes[i].error = water;
        }
        sort_network_24(&mut nodes[0..24]);
    } else {
        for i in w..32 {
            nodes[i].error = water;
        }
        sort_network_32(&mut nodes[0..32]);
    }
}

/// Sort the first `nodes[256].color` candidates in `nodes[0..256]`.
///
/// `nodes` must be a 257-element array; the element at index 256 stores the
/// count in its `color` field (same sentinel convention used by `sort_nodes_10`
/// and `sort_nodes_20`).
///
/// Uses stable sort for ≤ 16 elements, `radix_sort` for larger counts.
///
/// Mirrors `Sort100()` in `Etc2Compress.cpp`.
#[cfg(test)]
pub fn sort100(nodes: &mut [Node; 257]) -> usize {
    let n = nodes[256].color as usize;

    if n <= 16 {
        nodes[..n].sort_by(|a, b| {
            a.error.cmp(&b.error).then_with(|| a.color.cmp(&b.color))
        });
    } else {
        radix_sort(nodes, n);
    }

    n
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_nodes(errors: &[i32]) -> Vec<Node> {
        errors
            .iter()
            .enumerate()
            .map(|(i, &e)| Node::new(e, i as i32))
            .collect()
    }

    fn is_sorted_by_error(nodes: &[Node]) -> bool {
        nodes.windows(2).all(|w| w[0].error <= w[1].error)
    }

    #[test]
    fn sort_network_2_correct() {
        let mut n = make_nodes(&[5, 3]);
        sort_network_2(&mut n);
        assert!(is_sorted_by_error(&n));
        assert_eq!(n[0].error, 3);
    }

    #[test]
    fn sort_network_4_correct() {
        let mut n = make_nodes(&[9, 1, 7, 3]);
        sort_network_4(&mut n);
        assert!(is_sorted_by_error(&n));
    }

    #[test]
    fn sort_network_8_correct() {
        let mut n = make_nodes(&[8, 3, 6, 1, 7, 2, 5, 4]);
        sort_network_8(&mut n);
        assert!(is_sorted_by_error(&n));
    }

    #[test]
    fn sort_network_16_correct() {
        let mut n = make_nodes(&[15, 2, 11, 6, 9, 4, 13, 8, 1, 14, 7, 12, 3, 16, 5, 10]);
        sort_network_16(&mut n);
        assert!(is_sorted_by_error(&n));
    }

    #[test]
    fn sort_network_32_correct() {
        let errors: Vec<i32> = (0..32i32).rev().collect();
        let mut n = make_nodes(&errors);
        sort_network_32(&mut n);
        assert!(is_sorted_by_error(&n));
    }

    #[test]
    fn radix_sort_correct() {
        let errors: Vec<i32> = (0..100i32).rev().collect();
        let mut nodes = make_nodes(&errors);
        nodes.resize(256, Node::default());
        radix_sort(&mut nodes, 100);
        assert!(is_sorted_by_error(&nodes[..100]));
    }

    #[test]
    fn sort_nodes_10_filters_water() {
        let mut nodes = [Node::WORST; 17];
        // 5 candidates, water = 10
        let candidates = [3, 8, 15, 1, 6];
        for (i, &e) in candidates.iter().enumerate() {
            nodes[i] = Node::new(e, i as i32);
        }
        nodes[16].color = 5;

        sort_nodes_10(&mut nodes, 10);

        // survivors: errors < 10 → [3, 8, 1, 6]
        let count = nodes[16].color as usize;
        assert_eq!(count, 4);
        assert!(is_sorted_by_error(&nodes[..count]));
        assert!(nodes[..count].iter().all(|n| n.error < 10));
    }

    #[test]
    fn sort100_small_stable() {
        let mut nodes = [Node::WORST; 257];
        let data = [(5, 2), (5, 1), (3, 0), (7, 3)];
        for (i, &(e, c)) in data.iter().enumerate() {
            nodes[i] = Node::new(e, c);
        }
        nodes[256].color = 4;

        let n = sort100(&mut nodes);
        assert_eq!(n, 4);
        // Sorted by error, then by color for ties.
        assert_eq!(nodes[0].error, 3);
        assert_eq!(nodes[1].color, 1); // error=5, color=1 before color=2
        assert_eq!(nodes[2].color, 2);
        assert_eq!(nodes[3].error, 7);
    }
}
