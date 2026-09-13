import type { FolderConfig } from './types';

export function createFolder(id: number, name: string, items: string[]): FolderConfig {
  return { id, name, items };
}
