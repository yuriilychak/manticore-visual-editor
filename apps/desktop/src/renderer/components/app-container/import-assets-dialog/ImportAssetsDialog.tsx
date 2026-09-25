import { type FC, memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ImageRounded from '@mui/icons-material/ImageRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip } from '@mui/material';

import type { ProjectContent } from '../../../../project/types';

type ImportAssetsDialogProps = {
  bundles: readonly ProjectContent[];
  initialBundleId: number;
  onClose: () => void;
  onSubmit: (bundleId: number, filePaths: readonly string[]) => Promise<boolean>;
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

const ImportAssetsDialog: FC<ImportAssetsDialogProps> = ({ bundles, initialBundleId, onClose, onSubmit, open }) => {
  const { t } = useTranslation();
  const [bundleId, setBundleId] = useState(initialBundleId);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setBundleId(initialBundleId);
    setFilePaths([]);
    setQuery('');
  }, [initialBundleId, open]);

  const visibleFilePaths = useMemo(
    () => filePaths.filter((filePath) => getFileName(filePath).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
    [filePaths, query]
  );
  const handleSelectFiles = async () => {
    const selectedFilePaths = await window.manticore?.selectImportFiles?.();
    if (!selectedFilePaths) return;

    setFilePaths((current) => Array.from(new Set([...current, ...selectedFilePaths])));
  };
  const handleSubmit = async () => {
    if (!filePaths.length) return;

    setSubmitting(true);
    try {
      if (await onSubmit(bundleId, filePaths)) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle>{t('importAssets.title')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          <Toolbar disableGutters sx={{ gap: 1, minHeight: 'auto !important' }}>
            <Select
              aria-label={t('importAssets.bundle')}
              onChange={(event) => setBundleId(Number(event.target.value))}
              size="small"
              sx={{ width: 180 }}
              value={bundleId}
            >
              {bundles.map((bundle) => <MenuItem key={bundle.id} value={bundle.id}>{bundle.name}</MenuItem>)}
            </Select>
            <TextField
              aria-label={t('importAssets.search')}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('importAssets.search')}
              size="small"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }}
              sx={{ flex: 1 }}
              value={query}
            />
            <Button onClick={() => void handleSelectFiles()} variant="outlined">{t('importAssets.addFiles')}</Button>
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
                        title={isImage(filePath) ? <Box alt={getFileName(filePath)} component="img" src={toFileUrl(filePath)} sx={{ display: 'block', maxHeight: 256, maxWidth: 256 }} /> : ''}
                      >
                        <ImageRounded color={isImage(filePath) ? 'primary' : 'disabled'} fontSize="small" />
                      </Tooltip>
                    </TableCell>
                    <TableCell>{getAssetName(filePath)}</TableCell>
                    <TableCell>{getFileExtension(filePath).toLocaleUpperCase()}</TableCell>
                    <TableCell>{t(isImage(filePath) ? 'importAssets.image' : 'importAssets.font')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('importAssets.remove')}><IconButton aria-label={`${t('importAssets.remove')} ${getFileName(filePath)}`} onClick={() => setFilePaths((current) => current.filter((path) => path !== filePath))} size="small"><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
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
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={!filePaths.length || isSubmitting} onClick={() => void handleSubmit()} variant="contained">{t('common.import')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ImportAssetsDialog);
