import type { ImageMetadataField } from './types';

export const IMAGE_METADATA_FIELDS: readonly { minWidth: number; name: ImageMetadataField }[] = [
  { minWidth: 128, name: 'binarySize' },
  { minWidth: 128, name: 'imageFormat' },
  { minWidth: 192, name: 'realSize' },
  { minWidth: 192, name: 'croppedSize' }
];
