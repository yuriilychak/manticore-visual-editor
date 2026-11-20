use wasm_bindgen::prelude::*;

mod begin;
mod cache;
#[allow(dead_code)] // Activated by the forthcoming GA worker request.
mod ga;
mod nfp;
mod placement;
mod plan;
mod point;
mod polygon;
mod prepare;
mod protocol;

#[wasm_bindgen]
pub fn generate(request: Vec<f64>) -> Vec<f64> {
    match protocol::request_type(&request) {
        Some(protocol::TYPE_GA) if request.get(1) == Some(&2.0) => plan::generate(request),
        Some(protocol::TYPE_GA) if request.get(1) == Some(&3.0) => ga::select(request),
        Some(protocol::TYPE_GA) if request.get(1) == Some(&4.0) => placement::finalize(request),
        Some(protocol::TYPE_GA) if request.get(1) == Some(&5.0) => begin::generate(request),
        Some(protocol::TYPE_GA) if request.get(1) == Some(&6.0) => begin::complete(request),
        Some(protocol::TYPE_GA) => ga::generate(request),
        Some(protocol::TYPE_NFP) => nfp::generate(request),
        Some(protocol::TYPE_PLACEMENT) => placement::generate(request),
        Some(protocol::TYPE_PREPARE) => prepare::generate(request),
        _ => vec![0.0, 0.0],
    }
}
