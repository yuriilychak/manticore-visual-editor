import type { ProjectImageMetadata } from '@manticore/project';
import type { ProjectTextureAtlasQuad } from '@manticore/project/types';
import { packAtlasImages } from 'atlas-packer';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, Button, Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';
import { useProjectStructure } from '../../../../ProjectStructureContext';

type AtlasPreviewProps = { atlasIds: readonly number[] };
type SourceImage = { id: number; metadata: ProjectImageMetadata; source: ArrayBuffer };
type Preview = { atlasId: number; quad: ProjectTextureAtlasQuad; url: string } | null;
type SpritePixels = { height: number; scaleFix: boolean; width: number; x: number; y: number };

const getMimeType = (format: string) => format === 'svg+xml' ? 'image/svg+xml' : `image/${format}`;

const toPng = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not generate texture atlas image.');
  return { data: await blob.arrayBuffer(), url: URL.createObjectURL(blob) };
};

const processSpritePixels = (pixels: Uint8ClampedArray, atlasWidth: number, { height, scaleFix, width, x, y }: SpritePixels) => {
  const padding = 4;
  const left = x - padding, top = y - padding, regionWidth = width + padding * 2, regionHeight = height + padding * 2;
  const owner = new Int32Array(regionWidth * regionHeight).fill(-1);
  const queue: number[] = [];
  const indexAt = (localX: number, localY: number) => ((top + localY) * atlasWidth + left + localX) * 4;
  for (let localY = padding; localY < padding + height; ++localY) for (let localX = padding; localX < padding + width; ++localX) {
    const index = indexAt(localX, localY);
    if (!pixels[index + 3]) continue;
    const localIndex = localY * regionWidth + localX;
    owner[localIndex] = localIndex;
    queue.push(localIndex);
  }
  for (let offset = 0; offset < queue.length; ++offset) {
    const current = queue[offset];
    const localX = current % regionWidth, localY = Math.floor(current / regionWidth);
    for (const [nextX, nextY] of [[localX - 1, localY], [localX + 1, localY], [localX, localY - 1], [localX, localY + 1]]) {
      if (nextX < 0 || nextY < 0 || nextX >= regionWidth || nextY >= regionHeight) continue;
      const next = nextY * regionWidth + nextX;
      if (owner[next] >= 0) continue;
      owner[next] = owner[current]; queue.push(next);
    }
  }
  for (let localY = 0; localY < regionHeight; ++localY) for (let localX = 0; localX < regionWidth; ++localX) {
    const localIndex = localY * regionWidth + localX, source = owner[localIndex];
    if (source < 0) continue;
    const index = indexAt(localX, localY), sourceIndex = indexAt(source % regionWidth, Math.floor(source / regionWidth));
    const inInnerPadding = localX < padding || localX >= padding + width || localY < padding || localY >= padding + height;
    const distance = Math.max(Math.max(0, padding - localX, localX - (padding + width - 1)), Math.max(0, padding - localY, localY - (padding + height - 1)));
    if (scaleFix && inInnerPadding && distance <= 2) pixels.set(pixels.subarray(sourceIndex, sourceIndex + 4), index);
    if (!pixels[index + 3]) pixels.set(pixels.subarray(sourceIndex, sourceIndex + 3), index);
  }
};

const AtlasPreview: FC<AtlasPreviewProps> = ({ atlasIds }) => {
  const { t } = useTranslation();
  const { childrenIdsByParentId, contentById, projectPath } = useProjectStructure();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview>(null);
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

  const generateAtlas = useCallback(async (atlasId: number) => {
    const { loadImageMetadata, loadImageSource, saveTextureAtlas } = window.manticore ?? {};
    if (!loadImageMetadata || !loadImageSource || !saveTextureAtlas) throw new Error('Texture atlas generation is unavailable.');
    const imageIds = (childrenIdsByParentId[atlasId] ?? []).filter((id) => contentById[id]?.type === AssetType.Image);
    if (!imageIds.length) throw new Error('Texture atlas has no images.');
    const images = await Promise.all(imageIds.map(async (id): Promise<SourceImage> => ({ id, metadata: await loadImageMetadata(projectPath, id), source: await loadImageSource(projectPath, id) })));
    const layout = packAtlasImages(images.map(({ id, metadata }) => ({ height: metadata.croppedHeight, id, width: metadata.croppedWidth })));
    if (!layout) throw new Error('Texture atlas exceeds 4096 × 4096. Split these images into multiple atlases.');

    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not create texture atlas image.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const placement of layout.items) {
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
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (const placement of layout.items) {
      const image = images.find(({ id }) => id === placement.id)!;
      const { colorMargin, crop } = image.metadata.polygonSettings;
      processSpritePixels(pixels.data, canvas.width, { height: placement.rotated ? crop.width : crop.height, scaleFix: colorMargin, width: placement.rotated ? crop.height : crop.width, x: placement.x, y: placement.y });
    }
    context.putImageData(pixels, 0, 0);
    const quad: ProjectTextureAtlasQuad = { ...layout, outdated: false };
    const png = await toPng(canvas);
    await saveTextureAtlas(projectPath, atlasId, png.data, quad);
    if (atlasId === previewAtlasId) replacePreview({ atlasId, quad, url: png.url });
    else URL.revokeObjectURL(png.url);
  }, [childrenIdsByParentId, contentById, previewAtlasId, projectPath, replacePreview]);

  const generate = useCallback(async () => {
    setApplying(true); setError('');
    try { await Promise.all(atlasIds.map(generateAtlas)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not generate texture atlas.'); }
    finally { setApplying(false); }
  }, [atlasIds, generateAtlas]);

  const visiblePreview = preview?.atlasId === previewAtlasId ? preview : null;
  return <Box aria-label={t('details.atlasPreview')} bgcolor="action.hover" display="flex" flexDirection="column" gap={1} minHeight={132} p={2} role="region">
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
