// Perceptual weights for quality metrics (matching etc2compress-rs)
pub const K_GREEN: i32 = 715;
pub const K_RED: i32 = 213;
pub const K_BLUE: i32 = 72;
pub const K_COLOR: i32 = 1000;

/// Defines a compression format
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Format {
    Bc1,
    Bc3,
}

/// Defines a compression algorithm
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Algorithm {
    /// Fast, low quality
    RangeFit,
    /// Slow, high quality
    ClusterFit,
    /// Very slow, very high quality
    IterativeClusterFit,
}

impl Default for Algorithm {
    fn default() -> Self {
        Algorithm::ClusterFit
    }
}

/// RGB colour channel weights for use in block fitting
pub type ColourWeights = [f32; 3];

/// Uniform weights for each colour channel
pub const COLOUR_WEIGHTS_UNIFORM: ColourWeights = [1.0, 1.0, 1.0];

/// Weights based on the perceived brightness of each colour channel
pub const COLOUR_WEIGHTS_PERCEPTUAL: ColourWeights = [0.2126, 0.7152, 0.0722];

#[derive(Clone, Copy)]
pub struct Params {
    /// The compression algorithm to be used
    pub algorithm: Algorithm,
    /// Weigh the relative importance of each colour channel when fitting
    pub weights: ColourWeights,
    /// Weigh colour by alpha during cluster fit
    pub weigh_colour_by_alpha: bool,
}

impl Default for Params {
    fn default() -> Self {
        Params {
            algorithm: Algorithm::default(),
            weights: COLOUR_WEIGHTS_PERCEPTUAL,
            weigh_colour_by_alpha: false,
        }
    }
}
