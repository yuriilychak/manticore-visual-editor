pub mod shared;
pub mod etc2;
pub mod dxt5;

#[cfg(target_arch = "wasm32")]
mod wasm_api;

#[cfg(target_arch = "wasm32")]
pub use wasm_api::*;
