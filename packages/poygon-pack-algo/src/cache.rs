use std::collections::BTreeMap;

/// Opaque transport cache: `[entryCount, entryLength, nfpEntry..., ...]`.
/// Each NFP entry starts with its uint32 cache key and otherwise retains the
/// existing NFP-result encoding.
pub(crate) type Cache = BTreeMap<u32, Vec<f64>>;

pub(crate) fn parse(data: &[f64]) -> Option<Cache> {
    let count = *data.first()?;
    if !count.is_finite() || count.fract() != 0.0 || count < 0.0 {
        return None;
    }
    let mut index = 1;
    let mut cache = Cache::new();
    for _ in 0..count as usize {
        let length = *data.get(index)?;
        index += 1;
        if !length.is_finite() || length.fract() != 0.0 || length < 1.0 {
            return None;
        }
        let end = index.checked_add(length as usize)?;
        let entry = data.get(index..end)?;
        let key = *entry.first()?;
        if !key.is_finite() || key.fract() != 0.0 || !(0.0..=u32::MAX as f64).contains(&key) {
            return None;
        }
        cache.insert(key as u32, entry.to_vec());
        index = end;
    }
    (index == data.len()).then_some(cache)
}

pub(crate) fn serialize(cache: &Cache) -> Vec<f64> {
    let mut result = vec![cache.len() as f64];
    for entry in cache.values() {
        result.push(entry.len() as f64);
        result.extend(entry);
    }
    result
}

pub(crate) fn merge_payload(data: &[f64], index: &mut usize) -> Option<Cache> {
    let length = *data.get(*index)? as usize;
    *index += 1;
    let mut cache = parse(data.get(*index..*index + length)?)?;
    *index += length;
    let count = *data.get(*index)? as usize;
    *index += 1;
    for _ in 0..count {
        let length = *data.get(*index)? as usize;
        *index += 1;
        let entry = data.get(*index..*index + length)?;
        let key = *entry.first()? as u32;
        cache.insert(key, entry.to_vec());
        *index += length;
    }
    Some(cache)
}
