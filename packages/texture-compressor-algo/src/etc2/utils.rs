//! Bit/byte manipulation utilities mirroring Etc2Compress.cpp helpers.

/// Reverse bytes in a `u32` (matches C++ `BSWAP` / `bswap_32`).
#[inline(always)]
pub fn bswap(x: u32) -> u32 {
    x.swap_bytes()
}

/// Reverse bytes in a `u64` (matches C++ `BSWAP64` / `bswap_64`).
#[cfg(test)]
#[inline(always)]
pub fn bswap64(x: u64) -> u64 {
    x.swap_bytes()
}

/// Rotate right by 8 bits (matches C++ `BROR` = `_rotr(x, 8)`).
#[cfg(test)]
#[inline(always)]
pub fn bror(x: u32) -> u32 {
    x.rotate_right(8)
}

/// Expand a 4-bit colour nibble to 8 bits (matches C++ `ExpandColor4`).
///
/// Replicates the nibble into both halves: `0xA` → `0xAA`.
///
/// ```
/// assert_eq!(texcompress::etc2::utils::expand_color4(0xA), 0xAA);
/// assert_eq!(texcompress::etc2::utils::expand_color4(0x0), 0x00);
/// assert_eq!(texcompress::etc2::utils::expand_color4(0xF), 0xFF);
/// ```
#[inline(always)]
pub fn expand_color4(c: i32) -> i32 {
    (c << 4) ^ c
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bswap() {
        assert_eq!(bswap(0x12345678), 0x78563412);
        assert_eq!(bswap(0x00000000), 0x00000000);
        assert_eq!(bswap(0xFFFFFFFF), 0xFFFFFFFF);
        assert_eq!(bswap(0xAABBCCDD), 0xDDCCBBAA);
        // Round-trip
        assert_eq!(bswap(bswap(0xDEADBEEF)), 0xDEADBEEF);
    }

    #[test]
    fn test_bswap64() {
        assert_eq!(bswap64(0x0102030405060708), 0x0807060504030201);
        assert_eq!(bswap64(0xAABBCCDD11223344), 0x44332211DDCCBBAA);
        assert_eq!(bswap64(bswap64(0xCAFEBABEDEADBEEF)), 0xCAFEBABEDEADBEEF);
    }

    #[test]
    fn test_bror() {
        // C++: (x >> 8) | (x << 24)
        assert_eq!(bror(0x12345678), 0x78123456);
        assert_eq!(bror(0x00000001), 0x01000000);
        assert_eq!(bror(0xFF000000), 0x00FF0000);
        // Rotating by 32 (4 × 8) returns the original value.
        let x: u32 = 0xDEADBEEF;
        assert_eq!(bror(bror(bror(bror(x)))), x);
    }

    #[test]
    fn test_expand_color4() {
        assert_eq!(expand_color4(0x0), 0x00);
        assert_eq!(expand_color4(0xA), 0xAA);
        assert_eq!(expand_color4(0xF), 0xFF);
        assert_eq!(expand_color4(0x5), 0x55);
        // All 16 nibble values: expansion equals (c << 4) | c.
        for c in 0..=0xF {
            assert_eq!(expand_color4(c), (c << 4) | c, "c = {:#x}", c);
        }
    }
}
