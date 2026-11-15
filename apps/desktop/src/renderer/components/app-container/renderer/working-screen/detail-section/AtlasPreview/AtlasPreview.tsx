import type { ProjectImageMetadata } from '@manticore/project';
import type { ProjectTextureAtlasQuad } from '@manticore/project/types';
import { packAtlasImages } from 'atlas-packer';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTextureAtlasClusterizer, type TextureAtlasClusterizer } from 'texture-atlas-clusterizer';
import { createTextureCompressor, type TextureCompressor } from 'texture-compressor';

import { Alert, Box, Button, Dialog, DialogContent, LinearProgress, Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

type AtlasPreviewProps = { atlasIds: readonly number[] };
type SourceImage = { id: number; metadata: ProjectImageMetadata; source: ArrayBuffer };
type Preview = { atlasId: number; quad: ProjectTextureAtlasQuad; url: string } | null;
type AtlasGenerationProgress = { atlas: number; progress: number; status: string; total: number };

const getMimeType = (format: string) => format === 'svg+xml' ? 'image/svg+xml' : `image/${format}`;

const toPng = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not generate texture atlas image.');
  return { data: await blob.arrayBuffer(), url: URL.createObjectURL(blob) };
};

const compressedPreviewToPng = async (width: number, height: number, rgba: Uint8Array): Promise<ArrayBuffer> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Could not generate compressed texture preview.');
  const image = context.createImageData(width, height);
  image.data.set(rgba);
  context.putImageData(image, 0, 0);
  const png = await toPng(canvas);
  URL.revokeObjectURL(png.url);
  return png.data;
};

const toArrayBuffer = (data: Uint8Array): ArrayBuffer => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

const AtlasPreview: FC<AtlasPreviewProps> = ({ atlasIds }) => {
  const { t } = useTranslation();
  const { childrenIdsByParentId, contentById, projectPath } = useProjectStructure();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview>(null);
  const [generationProgress, setGenerationProgress] = useState<AtlasGenerationProgress | null>(null);
  const previewAtlasId = atlasIds.at(-1) ?? 0;
  const replacePreview = useCallback((nextPreview: Preview) => setPreview((current) => {
    if (current?.url) URL.revokeObjectURL(current.url);
    return nextPreview;
  }), []);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    if (!window.manticore?.loadTextureAtlas || !previewAtlasId) return;
    void window.manticore.loadTextureAtlas(projectPath, previewAtlasId)
      .then(({ image, quad }) => replacePreview({ atlasId: previewAtlasId, quad, url: URL.createObjectURL(new Blob([image], { type: 'image/png' })) }))
      .catch(() => replacePreview(null));
  }, [previewAtlasId, projectPath, replacePreview]);

  const generateAtlas = useCallback(async (atlasId: number, compressor: TextureCompressor, clusterizer: TextureAtlasClusterizer, updateProgress: (progress: number, status: string) => void) => {
    const { loadImageMetadata, loadImageSource, saveTextureAtlas } = window.manticore ?? {};
    if (!loadImageMetadata || !loadImageSource || !saveTextureAtlas) throw new Error('Texture atlas generation is unavailable.');
    const imageIds = (childrenIdsByParentId[atlasId] ?? []).filter((id) => contentById[id]?.type === AssetType.Image);
    if (!imageIds.length) throw new Error('Texture atlas has no images.');
    updateProgress(0.05, t('details.atlasGenerationLoadingImages'));
    const images = await Promise.all(imageIds.map(async (id): Promise<SourceImage> => ({ id, metadata: await loadImageMetadata(projectPath, id), source: await loadImageSource(projectPath, id) })));
    updateProgress(0.15, t('details.atlasGenerationPacking'));
    const layout = packAtlasImages(images.map(({ id, metadata }) => ({ height: metadata.croppedHeight, id, width: metadata.croppedWidth })));
    if (!layout) throw new Error('Texture atlas exceeds 4096 × 4096. Split these images into multiple atlases.');

    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not create texture atlas image.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const [index, placement] of layout.items.entries()) {
      updateProgress(0.2 + index / layout.items.length * 0.2, t('details.atlasGenerationDrawingImages'));
      const image = images.find(({ id }) => id === placement.id)!;
      const { crop } = image.metadata.polygonSettings;
      const bitmap = await createImageBitmap(new Blob([image.source], { type: getMimeType(image.metadata.format) }));
      try {
        if (placement.rotated) {
          context.save(); context.translate(placement.x + crop.height, placement.y); context.rotate(Math.PI / 2);
          context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height); context.restore();
        } else context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, placement.x, placement.y, crop.width, crop.height);
      } finally { bitmap.close(); }
    }
    updateProgress(0.45, t('details.atlasGenerationPadding'));
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    await clusterizer.applyColorMargins(pixels.data, canvas.width, layout.items.map((placement) => {
      const image = images.find(({ id }) => id === placement.id)!;
      const { colorMargin, crop } = image.metadata.polygonSettings;
      return { height: placement.rotated ? crop.width : crop.height, scaleFix: colorMargin, width: placement.rotated ? crop.height : crop.width, x: placement.x, y: placement.y };
    }));
    context.putImageData(pixels, 0, 0);
    const quad: ProjectTextureAtlasQuad = { ...layout, outdated: false };
    updateProgress(0.55, t('details.atlasGenerationEncodingPng'));
    const png = await toPng(canvas);
    const rgba = new Uint8Array(pixels.data);
    updateProgress(0.65, t('details.atlasGenerationCompressingEtc2'));
    const etc2 = await compressor.compress('etc2', { debug: true, height: canvas.height, pixels: rgba, width: canvas.width });
    updateProgress(0.8, t('details.atlasGenerationCompressingDxt5'));
    const dxt5 = await compressor.compress('dxt5', { debug: true, height: canvas.height, pixels: rgba, width: canvas.width });
    if (!etc2.debugRgba || !dxt5.debugRgba) throw new Error('Could not generate compressed texture previews.');
    updateProgress(0.9, t('details.atlasGenerationSaving'));
    await saveTextureAtlas(projectPath, atlasId, {
      dxt5: toArrayBuffer(dxt5.data),
      dxt5Preview: await compressedPreviewToPng(dxt5.width, dxt5.height, dxt5.debugRgba),
      etc2: toArrayBuffer(etc2.data),
      etc2Preview: await compressedPreviewToPng(etc2.width, etc2.height, etc2.debugRgba),
      png: png.data,
    }, quad);
    updateProgress(1, t('details.atlasGenerationSaving'));
    if (atlasId === previewAtlasId) replacePreview({ atlasId, quad, url: png.url });
    else URL.revokeObjectURL(png.url);
  }, [childrenIdsByParentId, contentById, previewAtlasId, projectPath, replacePreview, t]);

  const generate = useCallback(async () => {
    setApplying(true); setError('');
    setGenerationProgress({ atlas: 0, progress: 0, status: t('details.atlasGenerationPreparing'), total: atlasIds.length });
    let clusterizer: TextureAtlasClusterizer | undefined;
    try {
      const [compressor, createdClusterizer] = await Promise.all([createTextureCompressor(), createTextureAtlasClusterizer()]);
      clusterizer = createdClusterizer;
      for (const [index, atlasId] of atlasIds.entries()) {
        await generateAtlas(atlasId, compressor, clusterizer, (progress, status) => setGenerationProgress({ atlas: index + 1, progress: (index + progress) / atlasIds.length * 100, status, total: atlasIds.length }));
      }
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not generate texture atlas.'); }
    finally { clusterizer?.terminate(); setApplying(false); setGenerationProgress(null); }
  }, [atlasIds, generateAtlas, t]);

  const visiblePreview = preview?.atlasId === previewAtlasId ? preview : null;
  return <Box aria-label={t('details.atlasPreview')} bgcolor="action.hover" display="flex" flexDirection="column" gap={1} minHeight={132} p={2} role="region">
    <Dialog aria-labelledby="atlas-generation-progress-title" disableEscapeKeyDown onClose={() => undefined} open={applying}>
      <DialogContent sx={{ minWidth: 280 }}>
        <Typography id="atlas-generation-progress-title" mb={2} variant="body1">
          {t('details.generatingAtlas', { current: generationProgress?.atlas ?? 0, total: generationProgress?.total ?? atlasIds.length })}
        </Typography>
        <LinearProgress aria-label={generationProgress?.status} value={generationProgress?.progress ?? 0} variant="determinate" />
        <Typography color="text.secondary" mt={1} variant="body2">{generationProgress?.status}</Typography>
      </DialogContent>
    </Dialog>
    <Box alignItems="center" display="flex" justifyContent="space-between">
      <Typography component="h3" variant="body2">{t('details.atlasPreview')}</Typography>
      <Button disabled={applying} loading={applying} onClick={() => void generate()} size="small" variant="contained">{t('common.generate')}</Button>
    </Box>
    {error && <Alert severity="warning">{error}</Alert>}
    {visiblePreview ? <>
      <Box alt={t('details.atlasPreview')} component="img" maxHeight={384} maxWidth="100%" src={visiblePreview.url} sx={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
      <Typography variant="body2">{t('details.atlasSize', { height: visiblePreview.quad.height, width: visiblePreview.quad.width })}</Typography>
      {visiblePreview.quad.outdated && <Alert severity="warning">{t('details.atlasOutdated')}</Alert>}
    </> : <Typography color="text.secondary" variant="body2">{t('details.atlasPreviewUnavailable')}</Typography>}
  </Box>;
};

export default AtlasPreview;
