use texcompress::shared::image_io;
use texcompress::shared::quality;
use texcompress::shared::texture;
use texcompress::shared::TextureEngine;

use texcompress::dxt5::Dxt5Engine;
use texcompress::etc2::Etc2Engine;

fn run_engine<E: TextureEngine>(
    padded: &[u8],
    original: &[u8],
    tex_w: u32,
    tex_h: u32,
    mask: bool,
    border: i32,
) -> (Vec<u8>, Vec<u8>) {
    let tw = tex_w as usize;
    let th = tex_h as usize;
    let total_pixels = (tw * th) as f64;

    E::init();

    let t = std::time::Instant::now();
    let result = E::compress(padded, tex_w, tex_h, mask, border);
    let compress_ms = t.elapsed().as_millis();
    eprintln!("    Timing: compress {compress_ms}ms");

    // --- Alpha metrics ---
    let n_pixels = tw * th;
    let mse_alpha = quality::compute_alpha_mse(original, &result.decompressed_rgba, n_pixels);
    let ssim_alpha =
        quality::compute_alpha_ssim(original, &result.decompressed_rgba, tex_w, tex_h);

    if let Some(psnr) = quality::alpha_psnr(mse_alpha, total_pixels) {
        let ssim = quality::normalise_ssim(ssim_alpha, total_pixels);
        println!("      SubTexture A PSNR = {psnr:.6}, SSIM_4x4 = {ssim:.8}");
    } else {
        println!("      SubTexture A: Exactly");
    }

    // --- Colour metrics ---
    let mse_color = quality::compute_color_mse(original, &result.decompressed_rgba, n_pixels);
    let ssim_color =
        quality::compute_color_ssim(original, &result.decompressed_rgba, tex_w, tex_h);

    if let Some(psnr) = quality::color_wpsnr(mse_color, total_pixels) {
        let ssim = quality::normalise_ssim(ssim_color, total_pixels);
        println!("      SubTexture RGB wPSNR = {psnr:.6}, wSSIM_4x4 = {ssim:.8}");
    } else {
        println!("      SubTexture RGB: Exactly");
    }

    (result.data, result.decompressed_rgba)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        eprintln!(
            "Usage: texcompress --format <etc2|dxt5> [/retina] [/nomask] src [dst] [/debug result.png]"
        );
        std::process::exit(1);
    }

    let mut src_path: Option<&str> = None;
    let mut dst_path: Option<&str> = None;
    let mut debug_path: Option<&str> = None;
    let mut format: Option<&str> = None;
    let mut mask = true;
    let mut border: i32 = 1;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--format" => {
                i += 1;
                if i < args.len() {
                    format = Some(&args[i]);
                }
            }
            "/nomask" => mask = false,
            "/retina" => border = 2,
            "/debug" => {
                i += 1;
                if i < args.len() {
                    debug_path = Some(&args[i]);
                }
            }
            arg => {
                if src_path.is_none() {
                    src_path = Some(arg);
                } else if dst_path.is_none() {
                    dst_path = Some(arg);
                }
            }
        }
        i += 1;
    }

    let format = match format {
        Some("etc2") => "etc2",
        Some("dxt5") => "dxt5",
        Some(f) => {
            eprintln!("Unknown format: {f}. Use --format etc2 or --format dxt5");
            std::process::exit(1);
        }
        None => {
            eprintln!("Missing --format <etc2|dxt5>");
            std::process::exit(1);
        }
    };

    let src_path = match src_path {
        Some(p) => p,
        None => {
            eprintln!("No input");
            std::process::exit(1);
        }
    };

    // Load PNG → RGBA.
    let (rgba, width, height) = match image_io::load_png_as_rgba(src_path) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Problem with image {src_path}: {e}");
            std::process::exit(1);
        }
    };
    println!("Loaded {src_path}");

    let tex_w = texture::texture_dim(width);
    let tex_h = texture::texture_dim(height);

    if tex_w.max(tex_h) > 8192 {
        eprintln!("Huge image ({width}x{height})");
        std::process::exit(1);
    }

    println!("  Image {}x{}, Texture {}x{}", width, height, tex_w, tex_h);

    // Pad image to texture dimensions.
    let padded = texture::pad_to_texture(&rgba, width, height, tex_w, tex_h);
    let original = padded.clone();

    let (compressed, decompressed) = match format {
        "etc2" => run_engine::<Etc2Engine>(&padded, &original, tex_w, tex_h, mask, border),
        "dxt5" => run_engine::<Dxt5Engine>(&padded, &original, tex_w, tex_h, mask, border),
        _ => unreachable!(),
    };

    // Save compressed file.
    if let Some(path) = dst_path {
        match std::fs::write(path, &compressed) {
            Ok(_) => println!("    Saved {path}"),
            Err(e) => eprintln!("Lost {path}: {e}"),
        }
    }

    // Save debug image if requested.
    if let Some(debug_out) = debug_path {
        match image_io::save_rgba_as_png(debug_out, &decompressed, tex_w, tex_h) {
            Ok(_) => println!("  Saved {debug_out}"),
            Err(e) => eprintln!("Lost {debug_out}: {e}"),
        }
    }
}
