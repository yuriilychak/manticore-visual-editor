export type ContentType = 'project' | 'bundle' | 'atalas' | 'image' | 'project-folder' | 'bundle-folder';

export type FolderConfig = {
  id: number;
  name: string;
  items: string[];
};

export type BundleConfig = {
  id: string;
  name: string;
  version: number;
  folders?: FolderConfig[];
};

export type ProjectInfo = {
  bundles: Map<string, BundleConfig>;
  folders: FolderConfig[];
  name: string;
  path: string;
};

export type ProjectActionHandler = (
  action: string,
  contentType: ContentType,
  id: number,
  data?: unknown
) => void | Promise<void>;
