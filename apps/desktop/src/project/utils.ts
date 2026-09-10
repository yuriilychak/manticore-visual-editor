const MAX_U16 = 0xffff;

export function formatBundleDirectoryName(id: number): string {
  if (!Number.isInteger(id) || id < 0 || id > MAX_U16) {
    throw new RangeError('Bundle directory ID must be an unsigned 16-bit integer.');
  }

  return id.toString().padStart(5, '0');
}
