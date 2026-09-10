import type { FolderConfig } from './types';

export function createFolder(name: string, items: string[]): FolderConfig {
  return { name, items };
}
