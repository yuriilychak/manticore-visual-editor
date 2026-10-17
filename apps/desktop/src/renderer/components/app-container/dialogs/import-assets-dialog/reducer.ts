import type { ImportDialogAction, ImportDialogState } from './types';

export const createInitialState = (selectedBundleId: number): ImportDialogState => ({
  filePaths: [],
  imagePreviewUrls: {},
  importProgress: { completed: 0, total: 0 },
  isSelectingFiles: false,
  isSubmitting: false,
  processingImagePaths: new Set(),
  query: '',
  selectedBundleId
});

export const importDialogReducer = (state: ImportDialogState, action: ImportDialogAction): ImportDialogState => {
  switch (action.type) {
  case 'files-added':
    return { ...state, filePaths: Array.from(new Set([...state.filePaths, ...action.payload.filePaths])) };
  case 'file-removed': {
    const imagePreviewUrls = { ...state.imagePreviewUrls };
    const processingImagePaths = new Set(state.processingImagePaths);
    delete imagePreviewUrls[action.payload.filePath];
    processingImagePaths.delete(action.payload.filePath);
    return {
      ...state,
      filePaths: state.filePaths.filter((filePath) => filePath !== action.payload.filePath),
      imagePreviewUrls,
      processingImagePaths
    };
  }
  case 'images-processing-started': {
    const processingImagePaths = new Set(state.processingImagePaths);
    action.payload.filePaths.forEach((filePath) => processingImagePaths.add(filePath));
    return { ...state, processingImagePaths };
  }
  case 'images-processing-finished': {
    const processingImagePaths = new Set(state.processingImagePaths);
    action.payload.filePaths.forEach((filePath) => processingImagePaths.delete(filePath));
    return { ...state, processingImagePaths };
  }
  case 'previews-added':
    return { ...state, imagePreviewUrls: { ...state.imagePreviewUrls, ...action.payload.previewUrls } };
  case 'query-changed':
    return { ...state, query: action.payload.query };
  case 'selection-started':
    return { ...state, isSelectingFiles: true };
  case 'selection-finished':
    return { ...state, isSelectingFiles: false };
  case 'session-reset':
    return createInitialState(action.payload.bundleId);
  case 'submission-started':
    return { ...state, importProgress: { completed: 0, total: action.payload.total }, isSubmitting: true };
  case 'submission-progressed':
    return { ...state, importProgress: { completed: action.payload.completed, total: action.payload.total } };
  case 'submission-finished':
    return { ...state, isSubmitting: false };
  case 'bundle-selected':
    return { ...state, selectedBundleId: action.payload.bundleId };
  }
};
