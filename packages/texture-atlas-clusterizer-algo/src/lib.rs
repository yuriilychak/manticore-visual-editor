use std::collections::VecDeque;

fn apply_color_margin(pixels: &mut [u8], width: u32, height: u32, padding: u32, scale_fix: bool) {
    let pixel_count = width as usize * height as usize;
    if width == 0 || height == 0 || pixels.len() != pixel_count * 4 {
        return;
    }

    let mut owner = vec![usize::MAX; pixel_count];
    let mut queue = VecDeque::with_capacity(pixel_count);
    for index in 0..pixel_count {
        if pixels[index * 4 + 3] == 0 {
            continue;
        }
        owner[index] = index;
        queue.push_back(index);
    }

    while let Some(current) = queue.pop_front() {
        let x = current % width as usize;
        let y = current / width as usize;
        let neighbors = [
            x.checked_sub(1).map(|next_x| y * width as usize + next_x),
            (x + 1 < width as usize).then(|| y * width as usize + x + 1),
            y.checked_sub(1).map(|next_y| next_y * width as usize + x),
            (y + 1 < height as usize).then(|| (y + 1) * width as usize + x),
        ];
        for next in neighbors.into_iter().flatten() {
            if owner[next] != usize::MAX {
                continue;
            }
            owner[next] = owner[current];
            queue.push_back(next);
        }
    }

    for index in 0..pixel_count {
        let source = owner[index];
        if source == usize::MAX {
            continue;
        }
        let target_offset = index * 4;
        let source_offset = source * 4;
        let source_pixel = [
            pixels[source_offset], pixels[source_offset + 1], pixels[source_offset + 2], pixels[source_offset + 3],
        ];
        let x = index % width as usize;
        let y = index / width as usize;
        let in_padding = x < padding as usize || x >= width as usize - padding as usize || y < padding as usize || y >= height as usize - padding as usize;
        let distance = x.min(y).min(width as usize - 1 - x).min(height as usize - 1 - y);
        if scale_fix && in_padding && distance + 2 >= padding as usize {
            pixels[target_offset..target_offset + 4].copy_from_slice(&source_pixel);
        } else if pixels[target_offset + 3] == 0 {
            pixels[target_offset..target_offset + 3].copy_from_slice(&source_pixel[..3]);
        }
    }
}

/// Allocate a byte buffer in WASM linear memory for a Uint8Array passed from JavaScript.
#[unsafe(no_mangle)]
pub extern "C" fn allocate(length: usize) -> *mut u8 {
    Box::into_raw(vec![0; length].into_boxed_slice()) as *mut u8
}

/// Release a buffer previously obtained from `allocate`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn deallocate(pointer: *mut u8, length: usize) {
    if !pointer.is_null() {
        let bytes = std::ptr::slice_from_raw_parts_mut(pointer, length);
        drop(unsafe { Box::from_raw(bytes) });
    }
}

/// Update one padded RGBA sprite cluster in place.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn apply_color_margin_in_place(pointer: *mut u8, width: u32, height: u32, padding: u32, scale_fix: u32) {
    let length = width as usize * height as usize * 4;
    if pointer.is_null() {
        return;
    }
    let pixels = unsafe { std::slice::from_raw_parts_mut(pointer, length) };
    apply_color_margin(pixels, width, height, padding, scale_fix != 0);
}

#[cfg(test)]
mod tests {
    use super::apply_color_margin;

    #[test]
    fn propagates_opaque_pixel_rgb_to_transparent_cluster() {
        let pixels = vec![10, 20, 30, 0, 40, 50, 60, 255, 0, 0, 0, 0];
        let mut pixels = pixels;
        apply_color_margin(&mut pixels, 3, 1, 0, false);
        assert_eq!(pixels, vec![40, 50, 60, 0, 40, 50, 60, 255, 40, 50, 60, 0]);
    }
}
