import { type ImageConfig, ImagePolygonizer } from 'image-polygonizer';
import { type FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ImageRounded from '@mui/icons-material/ImageRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../types';

import type { ProjectContent } from '@manticore/project/types';

import { ImportAssets, type ImportAssetResult } from '../common';

type ImportAssetsDialogProps = {
  bundles: readonly ProjectContent[];
  initialBundleId: number;
  importErrors: readonly ImportAssetResult[];
  onClose: () => void;
  onAction: ProjectActionHandler;
  open: boolean;
};

const getFileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;
const getFileExtension = (filePath: string) => getFileName(filePath).split('.').pop()?.toLocaleLowerCase() ?? '';
const getAssetName = (filePath: string) => {
  const fileName = getFileName(filePath);
  const extension = getFileExtension(filePath);

  return extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
};
const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const isImage = (filePath: string) => IMAGE_EXTENSIONS.has(getFileExtension(filePath));
const toFileUrl = (filePath: string) => encodeURI(`file://${filePath.replaceAll('\\', '/')}`).replaceAll('#', '%23').replaceAll('?', '%3F');

const imageBitmapToPreviewUrl = (bitmap: ImageBitmap): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.height = bitmap.height;
  canvas.width = bitmap.width;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Unable to create image preview.'));

  context.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Unable to create image preview.')),
    'image/png'
  ));
};

const ImportAssetsDialog: FC<ImportAssetsDialogProps> = ({ bundles, importErrors, initialBundleId, onAction, onClose, open }) => {
  const { t } = useTranslation();
  const [bundleId, setBundleId] = useState(initialBundleId);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [isSelectingFiles, setSelectingFiles] = useState(false);
  const [processingImagePaths, setProcessingImagePaths] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState({ completed: 0, total: 0 });
  const imageConfigs = useRef(new Map<string, ImageConfig>());
  const previewUrls = useRef(new Map<string, string>());
  const imagePolygonizer = useMemo(() => new ImagePolygonizer(), []);

  const clearImportedImages = useCallback(() => {
    imageConfigs.current.forEach((image) => image.src.close());
    imageConfigs.current.clear();
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    clearImportedImages();
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Opening the dialog creates a fresh import session.
    setBundleId(initialBundleId);
    setFilePaths([]);
    setImagePreviewUrls({});
    setSelectingFiles(false);
    setProcessingImagePaths([]);
    setImportProgress({ completed: 0, total: 0 });
    setQuery('');
  }, [clearImportedImages, initialBundleId, open]);

  useEffect(() => clearImportedImages, [clearImportedImages]);

  const visibleFilePaths = useMemo(
    () => filePaths.filter((filePath) => getFileName(filePath).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
    [filePaths, query]
  );
  const handleSelectFiles = async () => {
    setSelectingFiles(true);
    let selectedFilePaths: string[] | undefined;
    try {
      selectedFilePaths = await window.manticore?.selectImportFiles?.();
    } finally {
      setSelectingFiles(false);
    }
    if (!selectedFilePaths) return;

    const newFilePaths = selectedFilePaths.filter((filePath) => !filePaths.includes(filePath));
    setFilePaths((current) => Array.from(new Set([...current, ...selectedFilePaths])));

    const imagePaths = newFilePaths.filter(isImage);
    if (!imagePaths.length || !window.manticore?.loadImportImages) return;

    setProcessingImagePaths((current) => Array.from(new Set([...current, ...imagePaths])));
    try {
      const loadedImages = await window.manticore.loadImportImages(imagePaths);
      const files = loadedImages.map(({ content, name, type }) => new File([content], name, { type }));
      const imageConfigsByPath = await imagePolygonizer.importImages(files as unknown as FileList);
      const previews = await Promise.all(imageConfigsByPath.map(async (image, index) => ({
        image,
        path: loadedImages[index].path,
        url: await imageBitmapToPreviewUrl(image.src)
      })));

      previews.forEach(({ image, path, url }) => {
        imageConfigs.current.set(path, image);
        previewUrls.current.set(path, url);
      });
      setImagePreviewUrls((current) => ({ ...current, ...Object.fromEntries(previews.map(({ path, url }) => [path, url])) }));
    } catch {
      // The original file URL remains available as a fallback preview.
    } finally {
      setProcessingImagePaths((current) => current.filter((filePath) => !imagePaths.includes(filePath)));
    }
  };
  const handleRemoveFile = (filePath: string) => {
    imageConfigs.current.get(filePath)?.src.close();
    imageConfigs.current.delete(filePath);
    const previewUrl = previewUrls.current.get(filePath);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrls.current.delete(filePath);
    setImagePreviewUrls((current) => Object.fromEntries(Object.entries(current).filter(([path]) => path !== filePath)));
    setFilePaths((current) => current.filter((path) => path !== filePath));
  };
  const handleImportProgress = useCallback((current: number, total: number) => {
    setImportProgress({ completed: current, total });
  }, []);
  const handleSubmit = async () => {
    if (!filePaths.length) return;

    setSubmitting(true);
    try {
      const images = filePaths.flatMap((filePath) => {
        const image = imageConfigs.current.get(filePath);
        return image ? [{ filePath, image }] : [];
      });
      setImportProgress({ completed: 0, total: filePaths.length });
      const serializedImages = await imagePolygonizer.serializeImageConfigs(
        images.map(({ image }) => image),
        () => undefined
      );
      const dataByPath = new Map(images.map(({ filePath }, index) => [filePath, serializedImages[index]]));
      const assets = filePaths.map((filePath) => ({ data: dataByPath.get(filePath), filePath }));
      await onAction('import-asset', AssetType.Bundle, bundleId, new ImportAssets(assets, handleImportProgress));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog disableEscapeKeyDown={isSubmitting} fullWidth maxWidth="md" onClose={isSubmitting ? undefined : onClose} open={open}>
      <DialogTitle>{t('importAssets.title')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          {isSubmitting && <Alert icon={<CircularProgress size={18} />} severity="info">{importProgress.completed} / {importProgress.total}</Alert>}
          {!!importErrors.length && <Alert severity="error">{importErrors.map(({ error, filePath }) => `${getFileName(filePath)}: ${error}`).join('\n')}</Alert>}
          <Toolbar disableGutters sx={{ gap: 1, minHeight: 'auto !important' }}>
            <Select
              aria-label={t('importAssets.bundle')}
              disabled={isSubmitting}
              onChange={(event) => setBundleId(Number(event.target.value))}
              size="small"
              sx={{ width: 180 }}
              value={bundleId}
            >
              {bundles.map((bundle) => <MenuItem key={bundle.id} value={bundle.id}>{bundle.name}</MenuItem>)}
            </Select>
            <TextField
              aria-label={t('importAssets.search')}
              disabled={isSubmitting}
              onChange={(event) => setQuery(event.target.value)}
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
          <TableContainer sx={{ bgcolor: 'background.default', height: '30vh' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell aria-label={t('importAssets.preview')} sx={{ width: 48 }} /><TableCell>{t('importAssets.fileName')}</TableCell><TableCell>{t('importAssets.fileType')}</TableCell><TableCell>{t('importAssets.asset')}</TableCell><TableCell align="right">{t('importAssets.actions')}</TableCell></TableRow></TableHead>
              <TableBody>
              {visibleFilePaths.map((filePath) => (
                <TableRow key={filePath}>
                    <TableCell>
                      <Tooltip
                        disableHoverListener={!isImage(filePath)}
                        slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', maxWidth: 'none', p: 1 } } }}
                        title={isImage(filePath) ? <Box alt={getFileName(filePath)} component="img" src={imagePreviewUrls[filePath] ?? toFileUrl(filePath)} sx={{ display: 'block', maxHeight: 256, maxWidth: 256 }} /> : ''}
                      >
                        {processingImagePaths.includes(filePath)
                          ? <CircularProgress aria-label={`${t('importAssets.preview')} ${getFileName(filePath)}`} size={18} />
                          : <ImageRounded color={isImage(filePath) ? 'primary' : 'disabled'} fontSize="small" />}
                      </Tooltip>
                    </TableCell>
                    <TableCell>{getAssetName(filePath)}</TableCell>
                    <TableCell>{getFileExtension(filePath).toLocaleUpperCase()}</TableCell>
                    <TableCell>{t(isImage(filePath) ? 'importAssets.image' : 'importAssets.font')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('importAssets.remove')}><IconButton aria-label={`${t('importAssets.remove')} ${getFileName(filePath)}`} disabled={isSubmitting} onClick={() => handleRemoveFile(filePath)} size="small"><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleFilePaths.length && <TableRow><TableCell colSpan={5}>{t('importAssets.noAssets')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isSubmitting} onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={!filePaths.length || isSubmitting || processingImagePaths.length > 0} onClick={() => void handleSubmit()} startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : undefined} variant="contained">{t('common.import')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ImportAssetsDialog);
