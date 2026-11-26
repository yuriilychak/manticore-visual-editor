/// Round `n` up to the next multiple of 4 (minimum 4).
pub fn texture_dim(n: u32) -> u32 {
    ((n.max(1) + 3) / 4) * 4
}

/// Pad an RGBA image to texture dimensions (multiples of 4).
/// Edge pixels are repeated to fill the padded area.
pub fn pad_to_texture(rgba: &[u8], img_w: u32, img_h: u32, tex_w: u32, tex_h: u32) -> Vec<u8> {
    let iw = img_w as usize;
    let ih = img_h as usize;
    let tw = tex_w as usize;
    let th = tex_h as usize;
    let src_stride = iw * 4;
    let dst_stride = tw * 4;

    let mut out = vec![0u8; th * dst_stride];

    for y in 0..ih {
        out[y * dst_stride..y * dst_stride + src_stride]
            .copy_from_slice(&rgba[y * src_stride..y * src_stride + src_stride]);

        // Pad right edge by repeating the last pixel.
        let last = y * src_stride + src_stride - 4;
        for x in iw..tw {
            out[y * dst_stride + x * 4..y * dst_stride + x * 4 + 4]
                .copy_from_slice(&rgba[last..last + 4]);
        }
    }

    // Pad bottom edge by repeating the last row.
    let last_row = (ih - 1) * dst_stride;
    for y in ih..th {
        let dst = y * dst_stride;
        out.copy_within(last_row..last_row + dst_stride, dst);
    }

    out
}

/// Expand the alpha mask outward by `radius` pixels using a summed-area table.
/// Each pixel's alpha is set to 1 if any pixel within the square neighbourhood
/// has non-zero alpha, otherwise 0.
pub fn outline_alpha(rgba: &mut [u8], width: u32, height: u32, radius: i32) {
    if radius <= 0 {
        return;
    }

    let r = radius as usize;
    let w = width as usize;
    let h = height as usize;
    let stride = w * 4;

    let full_w = 1 + r + w + r;
    let full_h = 1 + r + h + r;

    // Binary presence map: 1 where the source pixel has non-zero alpha.
    let mut data = vec![0u8; full_h * full_w];
    for y in 0..h {
        for x in 0..w {
            if rgba[y * stride + x * 4 + 3] != 0 {
                data[(y + r + 1) * full_w + (r + 1) + x] = 1;
            }
        }
    }

    // 2D summed-area table (integral image).
    let mut sum = vec![0i32; full_h * full_w];
    for py in (r + 1)..full_h {
        for x in (r + 1)..full_w {
            sum[py * full_w + x] = sum[(py - 1) * full_w + x]
                - sum[(py - 1) * full_w + x - 1]
                + data[py * full_w + x] as i32
                + sum[py * full_w + x - 1];
        }
    }

    // Query each output pixel: sum over the (2r+1)×(2r+1) window.
    let a = 2 * r + 1;
    for y in 0..h {
        for x in 0..w {
            let rl = y * full_w + x;
            let rh = (y + a) * full_w + x;
            let v = sum[rh + a] - sum[rh] + sum[rl] - sum[rl + a];
            rgba[y * stride + x * 4 + 3] = if v != 0 { 1 } else { 0 };
        }
    }
}

/// Set every pixel's alpha channel to 1 (treat the image as fully opaque).
pub fn ignore_alpha(rgba: &mut [u8], width: u32, height: u32) {
    let w = width as usize;
    let h = height as usize;
    for y in 0..h {
        for x in 0..w {
            rgba[y * w * 4 + x * 4 + 3] = 1;
        }
    }
}

/// Merge decompressed alpha and colour into a single debug RGBA image.
/// Takes A from `alpha_rgba` and RGB from `color_rgba`.
pub fn merge_debug(alpha_rgba: &mut [u8], color_rgba: &[u8]) {
    for (a_px, c_px) in alpha_rgba.chunks_mut(4).zip(color_rgba.chunks(4)) {
        a_px[0] = c_px[0]; // R from colour
        a_px[1] = c_px[1]; // G from colour
        a_px[2] = c_px[2]; // R from colour
        // a_px[3] keeps the decompressed alpha
    }
}
