import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import SearchRounded from '@mui/icons-material/SearchRounded';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar } from '@mui/material';

import { AssetType } from '../../../../../types';

import { ImportAssets } from '../../common';
import type { ModalComponent } from '../../modal-types';

import { EmptyImportAssetsRow, ImportAssetRow } from './cells';
import { IMAGE_PROCESSING_BATCH_SIZE, TABLE_OVERSCAN } from './constants';
import { estimateTableRowSize, getFileName, getVisibleFilePaths, isImage } from './helpers';
import { ImportAssetsSession } from './ImportAssetsSession';
import { createInitialState, importDialogReducer } from './reducer';

const ImportAssetsDialog: ModalComponent<'import-asset'> = ({ bundleId, bundles, errors, isOpen, onAction }) => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(importDialogReducer, bundleId, createInitialState);
  const { filePaths, imagePreviewUrls, importProgress, isSelectingFiles, isSubmitting, processingImagePaths, query, selectedBundleId } = state;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const importSession = useMemo(() => new ImportAssetsSession(), []);

  useEffect(() => {
    importSession.clear();
    if (!isOpen) return;

    dispatch({ type: 'session-reset', payload: { bundleId } });
  }, [bundleId, importSession, isOpen]);

  useEffect(() => () => importSession.dispose(), [importSession]);

  const visibleFilePaths = useMemo(() => getVisibleFilePaths(filePaths, query), [filePaths, query]);
  const getTableScrollElement = useCallback(() => tableContainerRef.current, []);
  const fileVirtualizer = useVirtualizer({
    count: visibleFilePaths.length,
    estimateSize: estimateTableRowSize,
    getScrollElement: getTableScrollElement,
    overscan: TABLE_OVERSCAN
  });
  const handleSelectFiles = async () => {
    dispatch({ type: 'selection-started' });
    let selectedFilePaths: string[] | undefined;
    try {
      selectedFilePaths = await window.manticore?.selectImportFiles?.();
    } finally {
      dispatch({ type: 'selection-finished' });
    }
    if (!selectedFilePaths) return;

    const newFilePaths = selectedFilePaths.filter((filePath) => !filePaths.includes(filePath));
    dispatch({ type: 'files-added', payload: { filePaths: selectedFilePaths } });

    const imagePaths = newFilePaths.filter(isImage);
    if (!imagePaths.length || !window.manticore?.loadImportImages) return;

    dispatch({ type: 'images-processing-started', payload: { filePaths: imagePaths } });
    try {
      for (let start = 0; start < imagePaths.length; start += IMAGE_PROCESSING_BATCH_SIZE) {
        const batchPaths = imagePaths.slice(start, start + IMAGE_PROCESSING_BATCH_SIZE);
        const loadedImages = await window.manticore.loadImportImages(batchPaths);
        const previewUrls = await importSession.importImages(loadedImages);
        dispatch({ type: 'previews-added', payload: { previewUrls } });
      }
    } catch {
      // The original file URL remains available as a fallback preview.
    } finally {
      dispatch({ type: 'images-processing-finished', payload: { filePaths: imagePaths } });
    }
  };
  const handleRemoveFile = useCallback((filePath: string) => {
    importSession.remove(filePath);
    dispatch({ type: 'file-removed', payload: { filePath } });
  }, [importSession]);
  const handleImportProgress = useCallback((current: number, total: number) => {
    dispatch({ type: 'submission-progressed', payload: { completed: current, total } });
  }, []);
  const handleSubmit = async () => {
    if (!filePaths.length) return;

    dispatch({ type: 'submission-started', payload: { total: filePaths.length } });
    try {
      const dataByPath = await importSession.serializeImages(filePaths);
      const assets = filePaths.map((filePath) => ({ ...dataByPath.get(filePath), filePath }));
      await onAction('import-asset', AssetType.Bundle, selectedBundleId, new ImportAssets(assets, handleImportProgress));
    } finally {
      dispatch({ type: 'submission-finished' });
    }
  };
  const handleClose = () => {
    void onAction('close-import-assets-dialog', AssetType.Bundle, selectedBundleId);
  };

  return (
    <Dialog disableEscapeKeyDown={isSubmitting} fullWidth maxWidth="md" onClose={isSubmitting ? undefined : handleClose} open={isOpen}>
      <DialogTitle>{t('importAssets.title')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          {isSubmitting && <Alert icon={<CircularProgress size={18} />} severity="info">{importProgress.completed} / {importProgress.total}</Alert>}
          {!!errors.length && <Alert severity="error">{errors.map(({ error, filePath }) => `${getFileName(filePath)}: ${error}`).join('\n')}</Alert>}
          <Toolbar disableGutters sx={{ gap: 1, minHeight: 'auto !important' }}>
            <Select
              aria-label={t('importAssets.bundle')}
              disabled={isSubmitting}
              onChange={(event) => dispatch({ type: 'bundle-selected', payload: { bundleId: Number(event.target.value) } })}
              size="small"
              sx={{ width: 180 }}
              value={selectedBundleId}
            >
              {bundles.map((bundle) => <MenuItem key={bundle.id} value={bundle.id}>{bundle.name}</MenuItem>)}
            </Select>
            <TextField
              aria-label={t('importAssets.search')}
              disabled={isSubmitting}
              onChange={(event) => dispatch({ type: 'query-changed', payload: { query: event.target.value } })}
              placeholder={t('importAssets.search')}
              size="small"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }}
              sx={{ flex: 1 }}
              value={query}
            />
            <Button disabled={isSelectingFiles || isSubmitting} onClick={() => void handleSelectFiles()} startIcon={isSelectingFiles ? <CircularProgress size={16} /> : undefined} variant="outlined">
              {t('importAssets.addFiles')}
            </Button>
          </Toolbar>
          <TableContainer ref={tableContainerRef} sx={{ bgcolor: 'background.default', height: '30vh' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell aria-label={t('importAssets.preview')} sx={{ width: 48 }} /><TableCell>{t('importAssets.fileName')}</TableCell><TableCell>{t('importAssets.fileType')}</TableCell><TableCell>{t('importAssets.asset')}</TableCell><TableCell align="right">{t('importAssets.actions')}</TableCell></TableRow></TableHead>
              <TableBody sx={{ display: 'block', height: fileVirtualizer.getTotalSize(), position: 'relative' }}>
                {visibleFilePaths.length
                  ? fileVirtualizer.getVirtualItems().map((virtualItem) => {
                    const filePath = visibleFilePaths[virtualItem.index];
                    return (
                      <ImportAssetRow
                        disabled={isSubmitting}
                        filePath={filePath}
                        isProcessing={processingImagePaths.has(filePath)}
                        key={filePath}
                        onRemove={handleRemoveFile}
                        previewUrl={imagePreviewUrls[filePath]}
                        start={virtualItem.start}
                      />
                    );
                  })
                  : <EmptyImportAssetsRow />}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isSubmitting} onClick={handleClose}>{t('common.cancel')}</Button>
        <Button disabled={!filePaths.length || isSubmitting || processingImagePaths.size > 0} onClick={() => void handleSubmit()} startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : undefined} variant="contained">{t('common.import')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ImportAssetsDialog);
