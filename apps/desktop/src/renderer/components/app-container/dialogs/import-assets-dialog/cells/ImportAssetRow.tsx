import { memo } from 'react';

import { TableRow } from '@mui/material';

import { ImportAssetActionsCell } from './ImportAssetActionsCell';
import { ImportAssetExtensionCell } from './ImportAssetExtensionCell';
import { ImportAssetNameCell } from './ImportAssetNameCell';
import { ImportAssetPreviewCell } from './ImportAssetPreviewCell';
import { ImportAssetTypeCell } from './ImportAssetTypeCell';

type ImportAssetRowProps = {
  disabled: boolean;
  filePath: string;
  isProcessing: boolean;
  onRemove: (filePath: string) => void;
  previewUrl?: string;
  start: number;
};

const ImportAssetRow = ({ disabled, filePath, isProcessing, onRemove, previewUrl, start }: ImportAssetRowProps) => (
  <TableRow sx={{ display: 'table', position: 'absolute', tableLayout: 'fixed', transform: `translateY(${start}px)`, width: '100%' }}>
    <ImportAssetPreviewCell filePath={filePath} isProcessing={isProcessing} previewUrl={previewUrl} />
    <ImportAssetNameCell filePath={filePath} />
    <ImportAssetExtensionCell filePath={filePath} />
    <ImportAssetTypeCell filePath={filePath} />
    <ImportAssetActionsCell disabled={disabled} filePath={filePath} onRemove={onRemove} />
  </TableRow>
);

export default memo(ImportAssetRow);
