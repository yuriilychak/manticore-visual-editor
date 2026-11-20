import type { ProjectImageMetadata } from '@manticore/project';
import type { ProjectTextureAtlasQuad } from '@manticore/project/types';
import { packAtlasImagesWithPolygons } from 'atlas-packer';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTextureAtlasClusterizer, type TextureAtlasClusterizer, type TextureAtlasSprite } from 'texture-atlas-clusterizer';
import { createTextureCompressor, type TextureCompressor } from 'texture-compressor';

import { Alert, Box, Button, Dialog, DialogContent, LinearProgress, Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

type AtlasPreviewProps = { atlasIds: readonly number[] };
type SourceImage = { id: number; metadata: ProjectImageMetadata; source: ArrayBuffer };
type Preview = { atlasId: number; quad: ProjectTextureAtlasQuad; url: string } | null;
type AtlasGenerationProgress = { atlas: number; progress: number; status: string; total: number };
type PolygonBounds = { height: number; maxX: number; maxY: number; minX: number; minY: number; width: number };

const getPolygonBounds = (points: Uint16Array | undefined, crop: { height: number; width: number; x: number; y: number }): PolygonBounds => {
  if (!points?.length) return { height: crop.height, maxX: crop.width, maxY: crop.height, minX: 0, minY: 0, width: crop.width };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    const x = points[index] - crop.x, y = points[index + 1] - crop.y;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { height: maxY - minY, maxX, maxY, minX, minY, width: maxX - minX };
};

const getMimeType = (format: string) => format === 'svg+xml' ? 'image/svg+xml' : `image/${format}`;

const toAtlasPolygons = ({ polygonSettings: { crop, polygons, polygonsApplied } }: ProjectImageMetadata) => {
  if (!polygonsApplied) return undefined;
  const normalized = polygons.map(({ points }) => Float32Array.from(points, (point, index) => point - (index % 2 ? crop.y : crop.x)));
  const valid = normalized.filter((points) => {
    if (points.length < 6) return false;
    let area = 0;
    for (let index = 0; index < points.length; index += 2) {
      const next = (index + 2) % points.length;
      area += points[index] * points[next + 1] - points[next] * points[index + 1];
    }
    return area !== 0;
  });
  return valid.length ? valid : undefined;
};

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
      .then(({ image, quad }) => replacePreview({
        atlasId: previewAtlasId,
        quad,
        url: URL.createObjectURL(new Blob([image], { type: 'image/png' }))
      }))
      .catch(() => replacePreview(null));
  }, [previewAtlasId, projectPath, replacePreview]);

  const generateAtlas = useCallback(async (atlasId: number, clusterizer: TextureAtlasClusterizer, compressor: TextureCompressor, updateProgress: (progress: number, status: string) => void) => {
    const { loadImageMetadata, loadImageSource, saveTextureAtlas } = window.manticore ?? {};
    if (!loadImageMetadata || !loadImageSource || !saveTextureAtlas) throw new Error('Texture atlas generation is unavailable.');
    const imageIds = (childrenIdsByParentId[atlasId] ?? []).filter((id) => contentById[id]?.type === AssetType.Image);
    if (!imageIds.length) throw new Error('Texture atlas has no images.');
    updateProgress(0.05, t('details.atlasGenerationLoadingImages'));
    const images = await Promise.all(imageIds.map(async (id): Promise<SourceImage> => ({
      id,
      metadata: await loadImageMetadata(projectPath, id),
      source: await loadImageSource(projectPath, id)
    })));
    updateProgress(0.15, t('details.atlasGenerationPacking'));
    const layout = await packAtlasImagesWithPolygons(
      images.map(({ id, metadata }) => ({ height: metadata.croppedHeight, id, polygons: toAtlasPolygons(metadata), width: metadata.croppedWidth })),
      {
        onError: (message) => setError(`Polygon packing failed. ${message}`),
        onProgress: (completePlacements, requiredPlacements) => updateProgress(0.15 + completePlacements / requiredPlacements * 0.05, `Polygon packing: ${completePlacements}/${requiredPlacements} iterations`),
      },
    );
    if (!layout) throw new Error('Texture atlas could not fit within a valid 4096 × 4096 power-of-two atlas. Split these images into multiple atlases.');

    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not create texture atlas image.');
    const bitmaps = new Map(await Promise.all(images.map(async (image) => [image.id, await createImageBitmap(new Blob([image.source], { type: getMimeType(image.metadata.format) }))] as const)));
    const sprites: TextureAtlasSprite[] = [];
    try {
      for (const [index, placement] of layout.items.entries()) {
        updateProgress(0.2 + index / layout.items.length * 0.2, t('details.atlasGenerationDrawingPolygons'));
        const image = images.find(({ id }) => id === placement.id)!;
        const bitmap = bitmaps.get(image.id)!;
        const { crop } = image.metadata.polygonSettings;
        const rotation = placement.rotation ?? (placement.rotated ? 90 : 0);
        const polygon = placement.polygonIndex == null ? undefined : image.metadata.polygonSettings.polygons[placement.polygonIndex];
        const bounds = getPolygonBounds(polygon?.points, crop);
        context.save();
        if (rotation === 90) context.translate(placement.x + bounds.maxY, placement.y - bounds.minX);
        else if (rotation === 180) context.translate(placement.x + bounds.maxX, placement.y + bounds.maxY);
        else if (rotation === 270) context.translate(placement.x - bounds.minY, placement.y + bounds.maxX);
        else context.translate(placement.x - bounds.minX, placement.y - bounds.minY);
        if (rotation) context.rotate(rotation * Math.PI / 180);
        context.beginPath();
        if (polygon) {
          for (let pointIndex = 0; pointIndex < polygon.points.length; pointIndex += 2) {
            const x = polygon.points[pointIndex] - crop.x, y = polygon.points[pointIndex + 1] - crop.y;
            if (pointIndex === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.closePath();
        } else context.rect(0, 0, crop.width, crop.height);
        context.clip();
        context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        context.restore();
        sprites.push({
          height: rotation % 180 === 0 ? bounds.height : bounds.width,
          scaleFix: image.metadata.polygonSettings.colorMargin,
          width: rotation % 180 === 0 ? bounds.width : bounds.height,
          x: placement.x,
          y: placement.y
        });
      }
    } finally { bitmaps.forEach((bitmap) => bitmap.close()); }
    const quad: ProjectTextureAtlasQuad = { ...layout, outdated: false };
    updateProgress(0.45, t('details.atlasGenerationPadding'));
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    await clusterizer.applyColorMargins(pixels.data, canvas.width, sprites);
    context.putImageData(pixels, 0, 0);
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
        await generateAtlas(atlasId, clusterizer, compressor, (progress, status) => setGenerationProgress({ atlas: index + 1, progress: (index + progress) / atlasIds.length * 100, status, total: atlasIds.length }));
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
