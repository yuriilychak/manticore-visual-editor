use texcompress::dxt5::Dxt5Engine;
use texcompress::etc2::Etc2Engine;
use texcompress::shared::quality;
use texcompress::shared::texture;
use texcompress::shared::TextureEngine;

// --- Helper to run a roundtrip through any engine ---

fn roundtrip_solid<E: TextureEngine>(rgba: &[u8], w: u32, h: u32) -> Vec<u8> {
    E::init();
    let result = E::compress(rgba, w, h, true, 1);
    result.decompressed_rgba
}

fn roundtrip_metrics<E: TextureEngine>(
    rgba: &[u8],
    w: u32,
    h: u32,
) -> (Option<f64>, Option<f64>) {
    E::init();
    let result = E::compress(rgba, w, h, true, 1);
    let n = (w * h) as usize;
    let total = n as f64;

    let mse_a = quality::compute_alpha_mse(rgba, &result.decompressed_rgba, n);
    let mse_c = quality::compute_color_mse(rgba, &result.decompressed_rgba, n);
    (
        quality::alpha_psnr(mse_a, total),
        quality::color_wpsnr(mse_c, total),
    )
}

// ── Solid colour roundtrip ──────────────────────────────────────────────

fn solid_red_rgba(w: usize, h: usize) -> Vec<u8> {
    let mut rgba = vec![0u8; w * h * 4];
    for i in 0..w * h {
        rgba[i * 4] = 255; // R
        rgba[i * 4 + 3] = 255; // A
    }
    rgba
}

#[test]
fn dxt5_solid_roundtrip() {
    let rgba = solid_red_rgba(4, 4);
    let dec = roundtrip_solid::<Dxt5Engine>(&rgba, 4, 4);
    let mse_a = quality::compute_alpha_mse(&rgba, &dec, 16);
    assert_eq!(mse_a, 0, "DXT5 solid alpha=255 should be exact");
}

#[test]
fn etc2_solid_roundtrip() {
    let rgba = solid_red_rgba(4, 4);
    let dec = roundtrip_solid::<Etc2Engine>(&rgba, 4, 4);
    let mse_a = quality::compute_alpha_mse(&rgba, &dec, 16);
    assert_eq!(mse_a, 0, "ETC2 solid alpha=255 should be exact");
}

// ── Transparent block ───────────────────────────────────────────────────

#[test]
fn dxt5_transparent_roundtrip() {
    let rgba = vec![0u8; 4 * 4 * 4];
    let dec = roundtrip_solid::<Dxt5Engine>(&rgba, 4, 4);
    let mse = quality::compute_alpha_mse(&rgba, &dec, 16);
    assert_eq!(mse, 0);
}

#[test]
fn etc2_transparent_roundtrip() {
    let rgba = vec![0u8; 4 * 4 * 4];
    let dec = roundtrip_solid::<Etc2Engine>(&rgba, 4, 4);
    let mse = quality::compute_alpha_mse(&rgba, &dec, 16);
    assert_eq!(mse, 0);
}

// ── Multi-block gradient ────────────────────────────────────────────────

fn gradient_rgba(w: usize, h: usize) -> Vec<u8> {
    let mut rgba = vec![0u8; w * h * 4];
    for y in 0..h {
        for x in 0..w {
            let i = (y * w + x) * 4;
            rgba[i] = ((x * 255) / w.max(1)) as u8;
            rgba[i + 1] = ((y * 255) / h.max(1)) as u8;
            rgba[i + 2] = 128;
            rgba[i + 3] = 255;
        }
    }
    rgba
}

#[test]
fn dxt5_gradient_quality() {
    let rgba = gradient_rgba(16, 16);
    let (_, color_psnr) = roundtrip_metrics::<Dxt5Engine>(&rgba, 16, 16);
    if let Some(p) = color_psnr {
        assert!(p > 20.0, "DXT5 gradient wPSNR should be > 20, got {p}");
    }
}

#[test]
fn etc2_gradient_quality() {
    let rgba = gradient_rgba(16, 16);
    let (_, color_psnr) = roundtrip_metrics::<Etc2Engine>(&rgba, 16, 16);
    if let Some(p) = color_psnr {
        assert!(p > 20.0, "ETC2 gradient wPSNR should be > 20, got {p}");
    }
}

// ── Compressed size ─────────────────────────────────────────────────────

#[test]
fn compressed_size_both_formats() {
    // Both ETC2 and DXT5/BC3 use 16 bytes per 4×4 block = 1 byte per pixel.
    assert_eq!(Etc2Engine::compressed_size(4, 4), 16);
    assert_eq!(Dxt5Engine::compressed_size(4, 4), 16);
    assert_eq!(Etc2Engine::compressed_size(256, 256), 65536);
    assert_eq!(Dxt5Engine::compressed_size(256, 256), 65536);
}

// ── Decompress standalone ───────────────────────────────────────────────

#[test]
fn dxt5_decompress_matches_compress_result() {
    let rgba = solid_red_rgba(4, 4);
    Dxt5Engine::init();
    let result = Dxt5Engine::compress(&rgba, 4, 4, true, 1);
    let dec2 = Dxt5Engine::decompress(&result.data, 4, 4);
    assert_eq!(result.decompressed_rgba, dec2);
}

#[test]
fn etc2_decompress_matches_compress_result() {
    let rgba = solid_red_rgba(4, 4);
    Etc2Engine::init();
    let result = Etc2Engine::compress(&rgba, 4, 4, true, 1);
    let dec2 = Etc2Engine::decompress(&result.data, 4, 4);
    assert_eq!(result.decompressed_rgba, dec2);
}

// ── Shared utilities ────────────────────────────────────────────────────

#[test]
fn texture_dim_roundup() {
    assert_eq!(texture::texture_dim(1), 4);
    assert_eq!(texture::texture_dim(4), 4);
    assert_eq!(texture::texture_dim(5), 8);
    assert_eq!(texture::texture_dim(256), 256);
    assert_eq!(texture::texture_dim(257), 260);
}

#[test]
fn pad_to_texture_edge_repeat() {
    let img: Vec<u8> = vec![
        10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, // row 0
        100, 110, 120, 255, 130, 140, 150, 255, 160, 170, 180, 255, // row 1
        190, 200, 210, 255, 220, 230, 240, 255, 250, 251, 252, 255, // row 2
    ];
    let padded = texture::pad_to_texture(&img, 3, 3, 4, 4);
    assert_eq!(padded.len(), 64);
    // Pixel (3,0) repeats pixel (2,0)
    assert_eq!(&padded[3 * 4..3 * 4 + 4], &[70, 80, 90, 255]);
    // Row 3 repeats row 2
    assert_eq!(&padded[48..64], &padded[32..48]);
}

#[test]
fn ssim_identity_both_formats() {
    let w: u32 = 8;
    let h: u32 = 8;
    let mut img = vec![0u8; (w * h * 4) as usize];
    for i in 0..(w * h) as usize {
        img[i * 4] = 128;
        img[i * 4 + 1] = 64;
        img[i * 4 + 2] = 200;
        img[i * 4 + 3] = 255;
    }

    let ssim_a = quality::compute_alpha_ssim(&img, &img, w, h);
    let ssim_c = quality::compute_color_ssim(&img, &img, w, h);
    let na = quality::normalise_ssim(ssim_a, (w * h) as f64);
    let nc = quality::normalise_ssim(ssim_c, (w * h) as f64);
    assert!((na - 1.0).abs() < 1e-9, "Alpha SSIM identity should be 1.0, got {na}");
    assert!((nc - 1.0).abs() < 1e-9, "Color SSIM identity should be 1.0, got {nc}");
}

// ── No-mask mode ────────────────────────────────────────────────────────

#[test]
fn dxt5_nomask_mode() {
    let mut rgba = vec![0u8; 4 * 4 * 4];
    for i in 0..16 {
        rgba[i * 4] = 200;
        rgba[i * 4 + 1] = 100;
        rgba[i * 4 + 2] = 50;
        rgba[i * 4 + 3] = 0; // fully transparent
    }
    // With mask=false, alpha-weighted fitting is disabled
    Dxt5Engine::init();
    let result = Dxt5Engine::compress(&rgba, 4, 4, false, 1);
    assert_eq!(result.decompressed_rgba.len(), 64);
}

#[test]
fn etc2_nomask_mode() {
    let mut rgba = vec![0u8; 4 * 4 * 4];
    for i in 0..16 {
        rgba[i * 4] = 200;
        rgba[i * 4 + 1] = 100;
        rgba[i * 4 + 2] = 50;
        rgba[i * 4 + 3] = 0;
    }
    Etc2Engine::init();
    let result = Etc2Engine::compress(&rgba, 4, 4, false, 1);
    assert_eq!(result.decompressed_rgba.len(), 64);
}
