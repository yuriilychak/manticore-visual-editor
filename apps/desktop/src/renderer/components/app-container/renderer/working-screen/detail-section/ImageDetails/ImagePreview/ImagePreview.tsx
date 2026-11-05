import type { ProjectImageMetadata } from '@manticore/project';
import { type FC, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography, useTheme } from '@mui/material';

import { useProjectStructure } from '../../../../../ProjectStructureContext';

import { CHECKER_SIZE, PREVIEW_PADDING, PREVIEW_SIZE } from './constants';

type ImagePreviewProps = {
  id: number;
  metadata: ProjectImageMetadata | null;
  refreshVersion: number;
  showPolygon: boolean;
  showTriangles: boolean;
};

const ImagePreview: FC<ImagePreviewProps> = ({ id, metadata, refreshVersion, showPolygon, showTriangles }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { projectPath } = useProjectStructure();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewResult, setPreviewResult] = useState<{ id: number; projectPath: string; bitmap: ImageBitmap } | null>(null);
  const [previewError, setPreviewError] = useState<{ id: number; projectPath: string } | null>(null);
  const bitmap = previewResult?.id === id && previewResult.projectPath === projectPath ? previewResult.bitmap : null;
  const unavailable = !window.manticore?.loadImageSource || (previewError?.id === id && previewError.projectPath === projectPath);

  const format = metadata?.format;
  useEffect(() => {
    const loadSource = window.manticore?.loadImageSource;
    if (!loadSource || !format) return;

    let active = true;
    void loadSource(projectPath, id)
      .then((bytes) => createImageBitmap(new Blob([bytes], { type: `image/${format}` })))
      .then((value) => {
        if (!active) value.close();
        else {
          setPreviewError(null);
          setPreviewResult({ id, projectPath, bitmap: value });
        }
      })
      .catch(() => {
        if (active) setPreviewError({ id, projectPath });
      });

    return () => { active = false; };
  }, [format, id, projectPath, refreshVersion]);

  useEffect(() => () => { previewResult?.bitmap.close(); }, [previewResult]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = theme.palette.background.default;
      context.fillRect(0, 0, width, height);
      context.fillStyle = theme.palette.background.paper;
      for (let y = 0; y < height; y += CHECKER_SIZE) {
        for (let x = (y / CHECKER_SIZE % 2) * CHECKER_SIZE; x < width; x += CHECKER_SIZE * 2) {
          context.fillRect(x, y, CHECKER_SIZE, CHECKER_SIZE);
        }
      }
      if (!bitmap) return;

      const scale = Math.min(width / bitmap.width, (height - PREVIEW_PADDING) / bitmap.height, PREVIEW_SIZE / bitmap.width);
      const imageWidth = bitmap.width * scale;
      const imageHeight = bitmap.height * scale;
      const imageX = (width - imageWidth) / 2;
      const imageY = (height - imageHeight) / 2;
      context.drawImage(bitmap, imageX, imageY, imageWidth, imageHeight);
      if ((!showPolygon && !showTriangles) || !metadata || !metadata.sourceWidth || !metadata.sourceHeight) return;

      const contentScale = Math.min(imageWidth / metadata.sourceWidth, imageHeight / metadata.sourceHeight);
      const contentWidth = metadata.sourceWidth * contentScale;
      const contentHeight = metadata.sourceHeight * contentScale;
      const contentX = imageX + (imageWidth - contentWidth) / 2;
      const contentY = imageY + (imageHeight - contentHeight) / 2;
      for (const { points, triangles } of metadata.polygonSettings.polygons) {
        const pointCount = points.length / 2;
        const pointAt = (index: number) => [contentX + (points[index * 2] - metadata.polygonSettings.offset) * contentScale, contentY + (points[index * 2 + 1] - metadata.polygonSettings.offset) * contentScale] as const;
        if (showPolygon && pointCount) {
          const polygonPoints = Array.from({ length: pointCount }, (_, index) => pointAt(index));
          const [firstX, firstY] = polygonPoints[0];
          context.beginPath();
          context.moveTo(firstX, firstY);
          for (const [x, y] of polygonPoints.slice(1)) context.lineTo(x, y);
          context.closePath();
          context.fillStyle = theme.palette.info.main;
          context.globalAlpha = 0.35;
          context.fill();
          context.globalAlpha = 1;
          context.strokeStyle = theme.palette.info.main;
          context.lineWidth = 2;
          context.stroke();
          context.fillStyle = theme.palette.info.main;
          for (const [x, y] of polygonPoints) context.fillRect(x - 3, y - 3, 6, 6);
        }
        if (!showTriangles) continue;
        for (const packedTriangle of triangles) {
          const indices = [(packedTriangle >>> 10) & 0b1_1111, (packedTriangle >>> 5) & 0b1_1111, packedTriangle & 0b1_1111];
          if (indices.some((index) => index >= pointCount)) continue;
          const [firstX, firstY] = pointAt(indices[0]);
          context.beginPath();
          context.moveTo(firstX, firstY);
          for (const index of indices.slice(1)) {
            const [x, y] = pointAt(index);
            context.lineTo(x, y);
          }
          context.closePath();
          context.fillStyle = theme.palette.error.main;
          context.globalAlpha = 0.4;
          context.fill();
          context.globalAlpha = 1;
          context.strokeStyle = theme.palette.error.main;
          context.lineWidth = 2;
          context.stroke();
        }
      }
    };
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    draw();
    return () => resizeObserver.disconnect();
  }, [bitmap, metadata, showPolygon, showTriangles, theme.palette.background.default, theme.palette.background.paper, theme.palette.error.main, theme.palette.info.main]);

  return (
    <Box bgcolor="action.hover" height={PREVIEW_SIZE + PREVIEW_PADDING} position="relative" width="100%">
      <Box aria-label={t('details.imagePreview')} component="canvas" height="100%" ref={canvasRef} sx={{ display: 'block', width: '100%' }} />
      {unavailable && (
        <Typography color="text.secondary" sx={{ left: '50%', position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)' }} variant="body2">
          {t('details.previewUnavailable')}
        </Typography>
      )}
    </Box>
  );
};

export default memo(ImagePreview);
