export const CHECKER_SIZE = 16;
export const PREVIEW_PADDING = 4;
export const PREVIEW_SIZE = 128;

export const PREVIEW_TOGGLE_IDS = ['polygon', 'triangles', 'slice9'] as const;

export type PreviewToggleId = typeof PREVIEW_TOGGLE_IDS[number];

export type PreviewState = {
  bitmap: ImageBitmap | null;
  id: number;
  isError: boolean;
  projectPath: string;
};

export const DEFAULT_CHECKED_BY_TOGGLE_ID: Record<PreviewToggleId, boolean> = {
  polygon: false,
  slice9: false,
  triangles: false
};

export const DEFAULT_PREVIEW_STATE: PreviewState = { bitmap: null, id: 0, isError: false, projectPath: '' };
