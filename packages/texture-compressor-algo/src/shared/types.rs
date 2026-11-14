// Perceptual weights for quality metrics
pub const K_GREEN: i32 = 715;
pub const K_RED: i32 = 213;
pub const K_BLUE: i32 = 72;
pub const K_COLOR: i32 = 1000;

// SSIM stability constants for 16-pixel (4×4) blocks
pub const G_SSIM_16K1L: f64 = (0.01 * 255.0 * 16.0) * (0.01 * 255.0 * 16.0);
pub const G_SSIM_16K2L: f64 = G_SSIM_16K1L * 9.0;

/// Supported texture compression formats.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TextureFormat {
    Etc2,
    Dxt5,
}

impl TextureFormat {
    pub fn file_extension(self) -> &'static str {
        match self {
            TextureFormat::Etc2 => "etc2",
            TextureFormat::Dxt5 => "dxt5",
        }
    }
}
