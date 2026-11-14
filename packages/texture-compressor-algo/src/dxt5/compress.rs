// Copyright (c) 2006 Simon Brown <si@sjbrown.co.uk>
// Copyright (c) 2018-2021 Jan Solanti <jhs@psonet.com>
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

use crate::dxt5::colourfit::{ClusterFit, ColourFit, RangeFit, SingleColourFit};
use crate::dxt5::colourset::ColourSet;
use crate::dxt5::compress_alpha;
use crate::dxt5::types::{Algorithm, Format, Params};

#[cfg(not(target_arch = "wasm32"))]
use rayon::prelude::*;

/// BC3 block size in bytes (8 alpha + 8 colour)
pub const BLOCK_SIZE: usize = 16;

/// Returns number of blocks needed for one dimension
pub fn num_blocks(size: usize) -> usize {
    (size + 3) / 4
}

/// Computes compressed size in bytes for given image dimensions
pub fn compressed_size(width: usize, height: usize) -> usize {
    num_blocks(width) * num_blocks(height) * BLOCK_SIZE
}

/// Compresses a single 4x4 block to BC3
pub fn compress_block_masked(
    rgba: [[u8; 4]; 16],
    mask: u32,
    params: Params,
    output: &mut [u8],
) {
    // compress alpha block (BC3 gradient alpha)
    compress_alpha::compress_bc3(&rgba, 3, mask, &mut output[..8]);

    // compress colour block
    let colours = ColourSet::new(&rgba, mask, Format::Bc3, params.weigh_colour_by_alpha);
    let colour_block = &mut output[8..16];

    if colours.count() == 1 {
        let mut fit = SingleColourFit::new(&colours, Format::Bc3);
        fit.compress(colour_block);
    } else if (params.algorithm == Algorithm::RangeFit) || (colours.count() == 0) {
        let mut fit = RangeFit::new(&colours, Format::Bc3, params.weights);
        fit.compress(colour_block);
    } else {
        let iterate = params.algorithm == Algorithm::IterativeClusterFit;
        let mut fit = ClusterFit::new(&colours, Format::Bc3, params.weights, iterate);
        fit.compress(colour_block);
    }
}

/// Decompresses a single BC3 block to 4x4 RGBA pixels
pub fn decompress_block(block: &[u8]) -> [[u8; 4]; 16] {
    let mut rgba = crate::dxt5::colourblock::decompress(&block[8..16], false);
    compress_alpha::decompress_bc3(&mut rgba, 3, &block[..8]);
    rgba
}

/// Compresses a full RGBA image to BC3/DXT5
pub fn compress(
    rgba: &[u8],
    width: usize,
    height: usize,
    params: Params,
    output: &mut [u8],
) {
    assert!(output.len() >= compressed_size(width, height));

    let blocks_wide = num_blocks(width);

    #[cfg(not(target_arch = "wasm32"))]
    let output_rows = output.par_chunks_mut(blocks_wide * BLOCK_SIZE);
    #[cfg(target_arch = "wasm32")]
    let output_rows = output.chunks_mut(blocks_wide * BLOCK_SIZE);

    output_rows.enumerate().for_each(|(y, output_row)| {
        let mut source_rgba = [[0u8; 4]; 16];
        let output_blocks = output_row.chunks_mut(BLOCK_SIZE);

        output_blocks.enumerate().for_each(|(x, output_block)| {
            let mut mask = 0u32;
            for py in 0..4 {
                for px in 0..4 {
                    let index = 4 * py + px;
                    let sx = 4 * x + px;
                    let sy = 4 * y + py;

                    if sx < width && sy < height {
                        let src_index = 4 * (width * sy + sx);
                        source_rgba[index].copy_from_slice(&rgba[src_index..src_index + 4]);
                        mask |= 1 << index;
                    }
                }
            }

            compress_block_masked(source_rgba, mask, params, output_block);
        });
    });
}

/// Decompresses a full BC3/DXT5 image to RGBA
pub fn decompress(data: &[u8], width: usize, height: usize, output: &mut [u8]) {
    let blocks_wide = num_blocks(width);

    #[cfg(not(target_arch = "wasm32"))]
    let output_rows = output.par_chunks_mut(width * 4 * 4);
    #[cfg(target_arch = "wasm32")]
    let output_rows = output.chunks_mut(width * 4 * 4);

    output_rows.enumerate().for_each(|(y, output_row)| {
        for x in 0..blocks_wide {
            let bidx = (x + y * blocks_wide) * BLOCK_SIZE;
            let rgba = decompress_block(&data[bidx..bidx + BLOCK_SIZE]);

            for py in 0..4 {
                for px in 0..4 {
                    let sx = 4 * x + px;
                    let sy = py;

                    if sx < width && (4 * y + sy) < height {
                        for i in 0..4 {
                            output_row[4 * (sx + sy * width) + i] = rgba[px + py * 4][i];
                        }
                    }
                }
            }
        }
    });
}
