export type BundleConfig = {
  id: string;
  name: string;
  version: number;
  atlases?: FolderConfig[];
};

export type FolderConfig = {
  name: string;
  items: string[];
};

export type ProjectConfig = {
  name: string;
  folders: FolderConfig[];
};
