// ---------------------------------------------------------------------------
// ETC2 colour decompression – Individual / Differential modes
// ---------------------------------------------------------------------------

/// ETC1/ETC2 modifier table used by Individual and Differential colour blocks.
/// Entry `q` gives (small_modifier, large_modifier).
/// Source: `g_table` in Etc2Compress.cpp, line 84.
const G_DELTA: [(u8, u8); 8] = [
    (2, 8), (5, 17), (9, 29), (13, 42),
    (18, 60), (24, 80), (33, 106), (47, 183),
];

/// Saturating-add or saturating-subtract `delta` from each of the three colour
/// channels, then pack the result back into a little-endian BGRA `u32`
/// (alpha fixed at 0xFF).
#[inline]
fn apply_color_modifier(b: u8, g: u8, r: u8, delta: u8, subtract: bool) -> u32 {
    let (b, g, r) = if subtract {
        (b.saturating_sub(delta), g.saturating_sub(delta), r.saturating_sub(delta))
    } else {
        (b.saturating_add(delta), g.saturating_add(delta), r.saturating_add(delta))
    };
    b as u32 | ((g as u32) << 8) | ((r as u32) << 16) | 0xFF00_0000
}

/// Decompress one "half" of an ETC1-compatible ETC2 Individual or Differential
/// colour block.
///
/// Fills two groups of 4 packed BGRA `u32` pixels (`p_low` and `p_high`).
/// Depending on the caller's context these groups represent:
/// - **vertical split (no-flip):** one pixel-column each (4 rows of 1 pixel).
/// - **horizontal split (flip):** two consecutive pixel-rows (1 row of 4 pixels).
///
/// # Parameters
/// - `color`  – base BGRA colour as a packed `u32`; bits \[31:24\] must be `0xFF`.
/// - `q`      – modifier-table row index (0–7).
/// - `data`   – the 32-bit index word (bytes 4–7 of the ETC2 block, big-endian).
/// - `shift`  – `0` for the first half, `8` for the second half.
///
/// # Bit layout of `data`
/// ```text
/// bits [shift +  0 .. shift +  3]  large/small selector for p_low  (1=large)
/// bits [shift +  4 .. shift +  7]  large/small selector for p_high
/// bits [shift + 16 .. shift + 19]  sign for p_low  (1=subtract, 0=add)
/// bits [shift + 20 .. shift + 23]  sign for p_high
/// ```
/// Source: `DecompressHalfColor` in Etc2Compress.cpp, line 1998.
pub fn decompress_half_color(
    p_low: &mut [u32; 4],
    p_high: &mut [u32; 4],
    color: u32,
    q: usize,
    data: u32,
    shift: u32,
) {
    let (small, large) = G_DELTA[q];

    // 4-bit nibbles extracted from `data`.
    // Low 16 bits  → large(1)/small(0) selector, one bit per pixel.
    // High 16 bits → sign: 1 = subtract, 0 = add.
    let sel_l  = (data >> shift)        & 0xF;
    let sel_h  = (data >> (shift +  4)) & 0xF;
    let sign_l = (data >> (shift + 16)) & 0xF;
    let sign_h = (data >> (shift + 20)) & 0xF;

    let cb = (color        & 0xFF) as u8;
    let cg = ((color >>  8) & 0xFF) as u8;
    let cr = ((color >> 16) & 0xFF) as u8;

    for i in 0..4_usize {
        let dl = if (sel_l >> i) & 1 != 0 { large } else { small };
        p_low[i]  = apply_color_modifier(cb, cg, cr, dl, (sign_l >> i) & 1 != 0);

        let dh = if (sel_h >> i) & 1 != 0 { large } else { small };
        p_high[i] = apply_color_modifier(cb, cg, cr, dh, (sign_h >> i) & 1 != 0);
    }
}

// ---------------------------------------------------------------------------
// ETC2 colour decompression – T mode and H mode
// ---------------------------------------------------------------------------

/// T/H mode distance modifier table.
/// Source: `g_tableHT` in Etc2Compress.cpp, line 86.
const G_TABLE_HT: [u8; 8] = [3, 6, 11, 16, 23, 32, 41, 64];

/// Pack Blue, Green, Red byte values into a little-endian BGRA `u32` with alpha=0xFF.
#[inline]
fn pack_bgra(b: u8, g: u8, r: u8) -> u32 {
    b as u32 | ((g as u32) << 8) | ((r as u32) << 16) | 0xFF00_0000
}

/// Write the 4-pixel palette lookup for one row of a T/H block.
///
/// `codes` is the full 32-bit index word shifted so that row y's bits are
/// at their natural positions (caller does `codes >> y`).
/// The `0x1111` mask isolates one bit per pixel at every 4th position,
/// combining high and low index bits into a 2-bit palette index for each pixel.
#[inline]
fn write_th_row(bgra: &mut [u8], colors: &[u32; 4], codes: u32) {
    const MASK: u32 = 0x1111;
    let row = (((codes >> 16) & MASK) << 1) | (codes & MASK);
    for x in 0..4_usize {
        let idx = ((row >> (x * 4)) & 3) as usize;
        let off = x * 4;
        bgra[off..off + 4].copy_from_slice(&colors[idx].to_le_bytes());
    }
}

/// Decompress one ETC2 T-mode colour block into a 4×4 BGRA region.
///
/// T-mode builds two base colours (A and B) and a distance `d`,
/// producing the 4-color palette `[color_a, color_b+d, color_b, color_b-d]`.
///
/// Bit extraction for colors A and B:
/// - Color A: bits [27:24] = R, [23:20] = G, [19:16] = B (from `c`)
/// - Color B: bits [15:12] = R, [11:8] = G, [7:4] = B (from `c`)
/// All channels are 4-bit, expanded to 8-bit via `c += c << 4`.
///
/// Source: `DecompressBlockColorT` in Etc2Compress.cpp, line 2041.
fn decompress_block_color_t(input: &[u8; 8], bgra: &mut [u8], stride: usize) {
    let c = u32::from_be_bytes([input[0], input[1], input[2], input[3]]);

    // 3-bit distance index (bits 3, 2, 0 of c rearranged)
    let d = (((c >> 1) & 6) + (c & 1)) as usize;
    let dist = G_TABLE_HT[d];

    // Extract color A nibbles into byte lanes, then expand 4-bit → 8-bit
    let mut a: u32 = (c >> 9) & (0xC << 16);
    a += (c >> 8) & (3 << 16);
    a += (c >> 12) & (0xF << 8);
    a += (c >> 16) & 0xF;
    a += a << 4;
    let [ba, ga, ra, _] = a.to_le_bytes();

    // Extract color B nibbles and expand
    let mut b: u32 = (c << 4) & (0xF << 16);
    b += c & (0xF << 8);
    b += (c >> 4) & 0xF;
    b += b << 4;
    let [bb, gb, rb, _] = b.to_le_bytes();

    // 4-color palette: [color_a, color_b+d, color_b, color_b-d]
    let colors = [
        pack_bgra(ba, ga, ra),
        pack_bgra(bb.saturating_add(dist), gb.saturating_add(dist), rb.saturating_add(dist)),
        pack_bgra(bb, gb, rb),
        pack_bgra(bb.saturating_sub(dist), gb.saturating_sub(dist), rb.saturating_sub(dist)),
    ];

    // Pixel indices: big-endian, column-major 2-bit codes for each 4×4 pixel
    let codes = u32::from_be_bytes([input[4], input[5], input[6], input[7]]);

    for y in 0..4_usize {
        write_th_row(&mut bgra[y * stride..], &colors, codes >> y);
    }
}

/// Decompress one ETC2 H-mode colour block into a 4×4 BGRA region.
///
/// H-mode extracts two base colours (A and B) using a different bit layout
/// than T-mode, computes a shared distance `d` with a numerical tie-break,
/// and produces the 4-color palette `[a+d, a-d, b+d, b-d]`.
///
/// Tie-break: the distance index LSB is set to `(a >= b)` when evaluated
/// on the pre-expanded (4-bit) packed colour values.
///
/// Source: `DecompressBlockColorH` in Etc2Compress.cpp, line 2111.
fn decompress_block_color_h(input: &[u8; 8], bgra: &mut [u8], stride: usize) {
    let c = u32::from_be_bytes([input[0], input[1], input[2], input[3]]);

    // Distance index: bits 2 and 0 of `c` placed at positions 2 and 1;
    // bit 0 (LSB) comes from the tie-break below.
    let mut d: u32 = (c & 4) + ((c << 1) & 2);

    // Extract color A nibbles (scrambled bit layout per ETC2 H-mode spec):
    //   Red   [19:16] ← c[30:27]
    //   Green [11:8]  ← { c[26:24], c[20] }
    //   Blue  [3:0]   ← { c[19], c[17:15] }
    let mut a: u32 = (c >> 11) & (0xF << 16);
    a += (c >> 15) & ((0xE << 8) + 7);
    a += (c >> 12) & (1 << 8);
    a += (c >> 16) & 8;

    // Extract color B nibbles:
    //   Red   [19:16] ← c[14:11]
    //   Green [11:8]  ← c[10:7]
    //   Blue  [3:0]   ← c[6:3]
    let mut b: u32 = (c << 5) & (0xF << 16);
    b += (c << 1) & (0xF << 8);
    b += (c >> 3) & 0xF;

    // Tie-break on pre-expansion values, then expand 4-bit → 8-bit per channel
    d |= (a >= b) as u32;
    let dist = G_TABLE_HT[d as usize];

    a += a << 4;
    b += b << 4;

    let [ba, ga, ra, _] = a.to_le_bytes();
    let [bb, gb, rb, _] = b.to_le_bytes();

    // 4-color palette: [color_a+d, color_a-d, color_b+d, color_b-d]
    let colors = [
        pack_bgra(ba.saturating_add(dist), ga.saturating_add(dist), ra.saturating_add(dist)),
        pack_bgra(ba.saturating_sub(dist), ga.saturating_sub(dist), ra.saturating_sub(dist)),
        pack_bgra(bb.saturating_add(dist), gb.saturating_add(dist), rb.saturating_add(dist)),
        pack_bgra(bb.saturating_sub(dist), gb.saturating_sub(dist), rb.saturating_sub(dist)),
    ];

    let codes = u32::from_be_bytes([input[4], input[5], input[6], input[7]]);

    for y in 0..4_usize {
        write_th_row(&mut bgra[y * stride..], &colors, codes >> y);
    }
}

/// Decompress one ETC2 Planar-mode colour block into a 4×4 BGRA region.
///
/// Planar mode defines three 6-7-6-bit (R-G-B) corner colours:
///   O = origin (top-left), H = horizontal (top-right), V = vertical (bottom-left).
///
/// Each pixel is linearly interpolated: `pixel(x,y) = (4·O + x·(H-O) + y·(V-O) + 2) >> 2`
/// clamped to [0, 255] per channel — no palette lookup.
///
/// Bit extraction faithfully matches `DecompressBlockColorP` in Etc2Compress.cpp, line 2183.
fn decompress_block_color_p(input: &[u8; 8], bgra: &mut [u8], stride: usize) {
    let d0 = u32::from_be_bytes([input[0], input[1], input[2], input[3]]);
    let d1 = u32::from_be_bytes([input[4], input[5], input[6], input[7]]);

    // Extract corner colours. Each packed as byte2=Red, byte1=Green, byte0=Blue
    // using the scrambled ETC2 Planar bit layout from d0 and d1.
    let mut co: u32 = (d0 >> 7) & (0xFC << 16); // Red   [23:18] ← d0[30:25]
    co += (d0 >> 9) & ((0x80 << 8) + 0x80);      // Green [15]    ← d0[24], Blue [7] ← d0[16]
    co += (d0 >> 8) & (0x7E << 8);               // Green [14:9]  ← d0[22:17]
    co += (d0 >> 6) & 0x60;                      // Blue  [6:5]   ← d0[12:11]
    co += (d0 >> 5) & 0x1C;                      // Blue  [4:2]   ← d0[9:7]

    let mut ch: u32 = (d0 << 17) & (0xF8 << 16); // Red   [23:19] ← d0[6:2]
    ch += (d0 << 18) & (4 << 16);                 // Red   [18]    ← d0[0]
    ch += (d1 >> 16) & (0xFE << 8);               // Green [15:9]  ← d1[31:25]
    ch += (d1 >> 17) & 0xFC;                      // Blue  [7:2]   ← d1[24:19]

    let mut cv: u32 = (d1 << 5) & (0xFC << 16);  // Red   [23:18] ← d1[18:13]
    cv += (d1 << 3) & (0xFE << 8);               // Green [15:9]  ← d1[12:6]
    cv += (d1 << 2) & 0xFC;                      // Blue  [7:2]   ← d1[5:0] (shifted)

    // Expand 6-bit R and B to 8-bit (replicate 2 MSBs into 2 LSBs),
    // and 7-bit G to 8-bit (replicate MSB into LSB).
    for c in [&mut co, &mut ch, &mut cv] {
        *c += (*c >> 6) & ((3 << 16) + 3); // R and B: fill bits [17:16] and [1:0]
        *c += (*c >> 7) & (1 << 8);        // G: fill bit [8]
    }

    let [bo, go, ro, _] = co.to_le_bytes();
    let [bh, gh, rh, _] = ch.to_le_bytes();
    let [bv, gv, rv, _] = cv.to_le_bytes();

    // Per-pixel bilinear interpolation: (4·O + x·(H−O) + y·(V−O) + 2) >> 2
    // `>> 2` is arithmetic (matching _mm_srai_epi16); packus_epi16 saturation → clamp(0,255).
    let interp = |o: u8, h: u8, v: u8, x: i16, y: i16| -> u8 {
        let val = 4 * o as i16 + x * (h as i16 - o as i16) + y * (v as i16 - o as i16) + 2;
        (val >> 2).clamp(0, 255) as u8
    };

    for y in 0..4_i16 {
        for x in 0..4_i16 {
            let b = interp(bo, bh, bv, x, y);
            let g = interp(go, gh, gv, x, y);
            let r = interp(ro, rh, rv, x, y);
            let off = y as usize * stride + x as usize * 4;
            bgra[off..off + 4].copy_from_slice(&pack_bgra(b, g, r).to_le_bytes());
        }
    }
}

/// Decompress one ETC2 colour block (8 bytes) into a 4×4 BGRA region.
///
/// Dispatches to Individual, Differential, T, H, or Planar sub-modes.
///
/// # Mode detection (via `c = BROR(BSWAP(first 4 bytes))`)
/// - bit 25 = 0 → Individual mode (two independent 4-bit colors)
/// - bit 25 = 1 → Differential mode; if 5+3-bit addition overflows per channel:
///   - R overflows → T mode
///   - G overflows → H mode
///   - B overflows → P (Planar) mode
/// - bit 24 = flip bit (0 = vertical split, 1 = horizontal split)
///
/// Source: `DecompressBlockColorEnhanced` in Etc2Compress.cpp, line 2261.
pub fn decompress_block_color_enhanced(input: &[u8; 8], bgra: &mut [u8], stride: usize) {
    // Big-endian load of first 4 bytes, then rotate right 8 (= BROR(BSWAP(c))).
    // After rotation: bits[31:24]=input[3] (flags), [23:16]=input[0] (R),
    //                 [15:8]=input[1] (G), [7:0]=input[2] (B).
    let c = u32::from_be_bytes([input[0], input[1], input[2], input[3]]).rotate_right(8);

    let a: u32;
    let b: u32;

    if c & (2 << 24) == 0 {
        // Individual mode: high nibble = color A, low nibble = color B (per channel).
        // Expand 4-bit → 8-bit by replicating the nibble: 0xN → 0xNN.
        let a_raw = c & 0xF0F0F0;
        a = a_raw | (a_raw >> 4);
        let b_raw = c & 0x0F0F0F;
        b = b_raw | (b_raw << 4);
    } else {
        // Differential mode: 5-bit base color A + signed 3-bit delta → color B.
        // The trick `(delta ^ 4) - 4` converts 3-bit unsigned to signed [-4, 3].
        // If the sum overflows the 5-bit range, bits land in 0x01010100 → T/H/P.
        let a_raw = c & 0xF8F8F8;
        let b_test = (((c & 0x070707) ^ 0x444444).wrapping_sub(0x040404) << 3)
            .wrapping_add(a_raw);

        if b_test & 0x01010100 != 0 {
            // R overflow → T mode; G overflow → H mode; otherwise P mode.
            if b_test & 0x01000000 != 0 {
                return decompress_block_color_t(input, bgra, stride);
            }
            if b_test & 0x00010000 != 0 {
                return decompress_block_color_h(input, bgra, stride);
            }
            return decompress_block_color_p(input, bgra, stride);
        }

        let b_raw = b_test & 0xF8F8F8;
        // Expand 5-bit → 8-bit: replicate top 3 bits into bottom 3.
        a = a_raw | ((a_raw >> 5) & 0x070707);
        b = b_raw | ((b_raw >> 5) & 0x070707);
    }

    // Set alpha = 0xFF in both packed colors.
    let a = a | 0xFF00_0000;
    let b = b | 0xFF00_0000;

    // Pixel index word: big-endian bytes 4-7.
    let way = u32::from_be_bytes([input[4], input[5], input[6], input[7]]);

    let qa = ((c >> (5 + 24)) & 7) as usize;
    let qb = ((c >> (2 + 24)) & 7) as usize;

    if c & (1 << 24) == 0 {
        // No-flip: vertical split. Half A = columns 0-1, half B = columns 2-3.
        // decompress_half_color fills column vectors: buf[col][row].
        // Then we transpose to write image rows.
        let mut col0 = [0u32; 4];
        let mut col1 = [0u32; 4];
        let mut col2 = [0u32; 4];
        let mut col3 = [0u32; 4];
        decompress_half_color(&mut col0, &mut col1, a, qa, way, 0);
        decompress_half_color(&mut col2, &mut col3, b, qb, way, 8);
        let buf = [col0, col1, col2, col3];

        for row in 0..4_usize {
            let row_start = row * stride;
            bgra[row_start     ..row_start +  4].copy_from_slice(&buf[0][row].to_le_bytes());
            bgra[row_start +  4..row_start +  8].copy_from_slice(&buf[1][row].to_le_bytes());
            bgra[row_start +  8..row_start + 12].copy_from_slice(&buf[2][row].to_le_bytes());
            bgra[row_start + 12..row_start + 16].copy_from_slice(&buf[3][row].to_le_bytes());
        }
    } else {
        // Flip: horizontal split. Half A = rows 0-1, half B = rows 2-3.
        // Rearrange `way` from column-major to row-major bit order so that
        // decompress_half_color can write pixels directly into image rows.
        let way = ((way & 0x00080008) << 9)
            ^ ((way & 0x00840084) << 6)
            ^ ((way & 0x08420842) << 3)
            ^  (way & 0x84218421)
            ^ ((way & 0x42104210) >> 3)
            ^ ((way & 0x21002100) >> 6)
            ^ ((way & 0x10001000) >> 9);

        // Half A → rows 0 and 1.
        let mut row0 = [0u32; 4];
        let mut row1 = [0u32; 4];
        decompress_half_color(&mut row0, &mut row1, a, qa, way, 0);
        for x in 0..4_usize {
            let off0 = x * 4;
            let off1 = stride + x * 4;
            bgra[off0..off0 + 4].copy_from_slice(&row0[x].to_le_bytes());
            bgra[off1..off1 + 4].copy_from_slice(&row1[x].to_le_bytes());
        }

        // Half B → rows 2 and 3.
        let mut row2 = [0u32; 4];
        let mut row3 = [0u32; 4];
        decompress_half_color(&mut row2, &mut row3, b, qb, way, 8);
        for x in 0..4_usize {
            let off2 = 2 * stride + x * 4;
            let off3 = 3 * stride + x * 4;
            bgra[off2..off2 + 4].copy_from_slice(&row2[x].to_le_bytes());
            bgra[off3..off3 + 4].copy_from_slice(&row3[x].to_le_bytes());
        }
    }
}

// ---------------------------------------------------------------------------
// ETC2 alpha decompression (existing)
// ---------------------------------------------------------------------------

/// ETC2 alpha block modifier table.
/// Row selected by the 4-bit table index; multiplied by the 4-bit multiplier.
const G_TABLE_A: [[i16; 8]; 16] = [
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

/// Decompress one 8-byte ETC2 alpha block into a 4×4 region of a BGRA image.
///
/// ETC2 alpha block layout (bytes in memory order):
///   byte 0        – base alpha (u8)
///   byte 1 [7:4]  – multiplier (0..15)
///   byte 1 [3:0]  – table index (0..15)
///   bytes 2..7    – 16 × 3-bit palette indices, column-major, MSB first
///
/// `bgra`   – slice starting at the top-left pixel of the destination 4×4 tile.
/// `stride` – byte distance between rows in the full BGRA buffer (= tex_w * 4).
pub fn decompress_block_alpha(input: &[u8; 8], bgra: &mut [u8], stride: usize) {
    let codes = u64::from_le_bytes(*input);

    let base = (codes & 0xFF) as i16;
    let table_idx = ((codes >> 8) & 0xF) as usize;  // low nibble of byte 1
    let multiplier = ((codes >> 12) & 0xF) as i16;  // high nibble of byte 1

    // Build 8-entry palette: clamp(base + delta * multiplier) into [0, 255].
    let mut alphas = [0u8; 8];
    for (i, &delta) in G_TABLE_A[table_idx].iter().enumerate() {
        alphas[i] = (base + delta * multiplier).clamp(0, 255) as u8;
    }

    // The 48-bit index field lives in bytes 2-7.  After byte-swapping the whole
    // u64, byte 2 lands at bits [47:40] — the highest index bits.
    let codes = codes.swap_bytes();

    // Pixel (x, y) index sits at bit offset (15 - x*4 - y) * 3 (ETC2 column-major).
    for x in 0..4usize {
        for y in 0..4usize {
            let shift = (15 - x * 4 - y) * 3;
            let idx = ((codes >> shift) & 7) as usize;
            bgra[y * stride + x * 4 + 3] = alphas[idx];
        }
    }
}

/// Decompress colour for every 4×4 block of a full ETC2 texture.
///
/// `etc2`  – full ETC2 buffer (tex_w/4 * tex_h/4 * 16 bytes).
///           Each 16-byte block is [0..8] alpha data, [8..16] colour data.
/// `bgra`  – destination tex_w * tex_h * 4 BGRA buffer; the B, G, R channels
///           (bytes 0-2 of each pixel) are written. Alpha (byte 3) is left untouched.
pub fn decompress_color_texture(etc2: &[u8], bgra: &mut [u8], tex_w: u32, tex_h: u32) {
    let blocks_x = (tex_w / 4) as usize;
    let blocks_y = (tex_h / 4) as usize;
    let stride = (tex_w * 4) as usize;

    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            let etc2_off = (by * blocks_x + bx) * 16;
            // Colour data is in the second 8 bytes of each 16-byte block.
            let color_block: &[u8; 8] =
                etc2[etc2_off + 8..etc2_off + 16].try_into().unwrap();

            let px_off = (by * 4 * tex_w as usize + bx * 4) * 4;
            decompress_block_color_enhanced(color_block, &mut bgra[px_off..], stride);
        }
    }
}
///
/// `etc2`  – full ETC2 buffer (tex_w * tex_h bytes).  Each 16-byte block is
///           [0..8] alpha data, [8..16] colour data.
/// `bgra`  – destination tex_w * tex_h * 4 BGRA buffer; only the A channel
///           (byte 3 of each pixel) is written.
pub fn decompress_alpha_texture(etc2: &[u8], bgra: &mut [u8], tex_w: u32, tex_h: u32) {
    let blocks_x = (tex_w / 4) as usize;
    let blocks_y = (tex_h / 4) as usize;
    let stride = (tex_w * 4) as usize;

    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            let etc2_off = (by * blocks_x + bx) * 16;
            let alpha_block: &[u8; 8] =
                etc2[etc2_off..etc2_off + 8].try_into().unwrap();

            let px_off = (by * 4 * tex_w as usize + bx * 4) * 4;
            decompress_block_alpha(alpha_block, &mut bgra[px_off..], stride);
        }
    }
}
