import type { FolderConfig } from './types';

export function createFolder(id: number, name: string, items: string[]): FolderConfig {
  return { id, name, items };
}

export function isFolderConfig(value: unknown): value is FolderConfig {
  if (typeof value !== 'object' || value === null) return false;

  const { id, items, name } = value as Record<string, unknown>;
  return (
    typeof id === 'number' &&
    typeof name === 'string' &&
    Array.isArray(items) &&
    items.every((item) => typeof item === 'string')
  );
}
