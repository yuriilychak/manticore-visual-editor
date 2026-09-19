import type { FolderConfig } from '../types';

export type { FolderConfig } from '../types';

export type ProjectConfig = {
  name: string;
  folders: FolderConfig[];
};
