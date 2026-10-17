import { TABLE_ROW_HEIGHT } from './constants';

const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);

export const getFileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;
export const getFileExtension = (filePath: string) => getFileName(filePath).split('.').pop()?.toLocaleLowerCase() ?? '';
export const getAssetName = (filePath: string) => {
  const fileName = getFileName(filePath);
  const extension = getFileExtension(filePath);

  return extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
};
export const getVisibleFilePaths = (filePaths: readonly string[], query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return filePaths.filter((filePath) => getFileName(filePath).toLocaleLowerCase().includes(normalizedQuery));
};
export const isImage = (filePath: string) => IMAGE_EXTENSIONS.has(getFileExtension(filePath));
export const toFileUrl = (filePath: string) => encodeURI(`file://${filePath.replaceAll('\\', '/')}`).replaceAll('#', '%23').replaceAll('?', '%3F');
export const estimateTableRowSize = () => TABLE_ROW_HEIGHT;
