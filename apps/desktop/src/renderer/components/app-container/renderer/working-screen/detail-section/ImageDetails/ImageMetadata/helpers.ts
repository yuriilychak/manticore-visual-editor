const BYTE_BASE = 1024;
const BYTE_UNITS = ['KB', 'MB', 'GB', 'TB', 'PB'];

export const formatBytes = (bytes: number, bytesLabel: string) => {
  if (bytes < BYTE_BASE) return `${bytes.toLocaleString()} ${bytesLabel}`;

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTE_BASE)) - 1, BYTE_UNITS.length - 1);
  const value = bytes / BYTE_BASE ** (unitIndex + 1);
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${BYTE_UNITS[unitIndex]}`;
};

export const formatSize = (width: number, height: number) => `${width} × ${height} px`;
