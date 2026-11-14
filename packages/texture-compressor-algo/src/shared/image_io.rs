use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

use png::ColorType;

/// Load a PNG file and return raw pixels in **RGBA** order together with
/// the image dimensions. Any input colour type (palette, grey, RGB, RGBA,
/// 16-bit) is normalised to 8-bit RGBA.
pub fn load_png_as_rgba(path: &str) -> Result<(Vec<u8>, u32, u32), String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut decoder = png::Decoder::new(file);

    // Expand palette/grey/16-bit to 8-bit RGB(A).
    decoder.set_transformations(
        png::Transformations::normalize_to_color8() | png::Transformations::ALPHA,
    );

    let mut reader = decoder.read_info().map_err(|e| e.to_string())?;

    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(|e| e.to_string())?;

    let width = info.width;
    let height = info.height;
    let bytes = &buf[..info.buffer_size()];

    let rgba: Vec<u8> = match info.color_type {
        ColorType::Rgba => bytes.to_vec(),
        ColorType::Rgb => {
            let mut out = Vec::with_capacity(width as usize * height as usize * 4);
            for chunk in bytes.chunks(3) {
                out.extend_from_slice(chunk);
                out.push(0xFF);
            }
            out
        }
        ColorType::GrayscaleAlpha => {
            let mut out = Vec::with_capacity(width as usize * height as usize * 4);
            for chunk in bytes.chunks(2) {
                let g = chunk[0];
                out.extend_from_slice(&[g, g, g, chunk[1]]);
            }
            out
        }
        ColorType::Grayscale => {
            let mut out = Vec::with_capacity(width as usize * height as usize * 4);
            for &g in bytes {
                out.extend_from_slice(&[g, g, g, 0xFF]);
            }
            out
        }
        ColorType::Indexed => {
            return Err("indexed PNG not fully expanded — apply transformations".into());
        }
    };

    Ok((rgba, width, height))
}

/// Write an RGBA buffer to a PNG file.
pub fn save_rgba_as_png(path: &str, rgba: &[u8], width: u32, height: u32) -> Result<(), String> {
    let file = File::create(Path::new(path)).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);

    let mut encoder = png::Encoder::new(writer, width, height);
    encoder.set_color(ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);

    let mut png_writer = encoder.write_header().map_err(|e| e.to_string())?;
    png_writer
        .write_image_data(rgba)
        .map_err(|e| e.to_string())?;
    Ok(())
}
