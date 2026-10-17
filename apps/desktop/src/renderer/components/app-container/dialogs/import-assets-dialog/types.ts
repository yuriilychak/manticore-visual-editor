import type { ReducerAction } from '../../../../../types';

import type { ModalPropsMap } from '../../modal-types';

export type ImportAssetsDialogData = ModalPropsMap['import-asset'];

export type ImportDialogState = {
  filePaths: readonly string[];
  imagePreviewUrls: Readonly<Record<string, string>>;
  importProgress: { completed: number; total: number };
  isSelectingFiles: boolean;
  isSubmitting: boolean;
  processingImagePaths: ReadonlySet<string>;
  query: string;
  selectedBundleId: number;
};

export type ImportDialogAction =
  | Required<ReducerAction<'files-added', { filePaths: readonly string[] }>>
  | Required<ReducerAction<'file-removed', { filePath: string }>>
  | Required<ReducerAction<'images-processing-finished', { filePaths: readonly string[] }>>
  | Required<ReducerAction<'images-processing-started', { filePaths: readonly string[] }>>
  | Required<ReducerAction<'previews-added', { previewUrls: Readonly<Record<string, string>> }>>
  | Required<ReducerAction<'query-changed', { query: string }>>
  | ReducerAction<'selection-finished'>
  | ReducerAction<'selection-started'>
  | Required<ReducerAction<'session-reset', { bundleId: number }>>
  | ReducerAction<'submission-finished'>
  | Required<ReducerAction<'submission-progressed', { completed: number; total: number }>>
  | Required<ReducerAction<'submission-started', { total: number }>>
  | Required<ReducerAction<'bundle-selected', { bundleId: number }>>;
