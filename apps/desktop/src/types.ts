export type ContentType = 'project' | 'bundle' | 'atalas' | 'image' | 'project-folder' | 'bundle-folder';

export type ProjectActionHandler = (
  action: string,
  contentType: ContentType,
  id: number,
  data?: unknown
) => void | Promise<void>;
