import type { ProjectImageMetadata } from '@manticore/project';
import { type FC, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography, useTheme } from '@mui/material';

import { useProjectStructure } from '../../../../../ProjectStructureContext';

import { DEFAULT_CHECKED_BY_TOGGLE_ID, DEFAULT_PREVIEW_STATE, PREVIEW_PADDING, PREVIEW_SIZE, PREVIEW_TOGGLE_IDS, type PreviewState } from './constants';
import ImagePreviewBuilder, { type Slice9 } from './ImagePreviewBuilder';
import PreviewToggle from './PreviewToggle';

type ImagePreviewProps = {
  id: number;
  metadata: ProjectImageMetadata | null;
  refreshVersion: number;
  slice9?: Slice9;
};

const ImagePreview: FC<ImagePreviewProps> = ({ id, metadata, refreshVersion, slice9 }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { projectPath } = useProjectStructure();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<PreviewState>(DEFAULT_PREVIEW_STATE);
  const [checkedByToggleId, setCheckedByToggleId] = useState(DEFAULT_CHECKED_BY_TOGGLE_ID);
  const bitmap = preview.id === id && preview.projectPath === projectPath ? preview.bitmap : null;
  const unavailable = !window.manticore?.loadImageSource || (preview.isError && preview.id === id && preview.projectPath === projectPath);
  const format = metadata?.format;

  useEffect(() => {
    if (!window.manticore?.loadImageSource || !format) return;

    const request = { active: true };
    void ImagePreviewBuilder.loadSource(projectPath, id, format, request).then((value) => value && setPreview(value));

    return () => { request.active = false; };
  }, [format, id, projectPath, refreshVersion]);

  useEffect(() => () => { preview.bitmap?.close(); }, [preview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const draw = () => new ImagePreviewBuilder({ bitmap, canvas, checkedByToggleId, context, metadata, slice9, theme }).draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    draw();
    return () => resizeObserver.disconnect();
  }, [bitmap, checkedByToggleId, metadata, slice9, theme]);

  return (
    <Box bgcolor="action.hover" width="100%">
      <Box aria-label={t('details.imagePreview')} component="canvas" height={PREVIEW_SIZE + PREVIEW_PADDING} ref={canvasRef} sx={{ display: 'block', width: '100%' }} />
      <Box display="flex" gap={1} px={1} py={0.5}>
        {PREVIEW_TOGGLE_IDS.map((toggleId) => (slice9 || toggleId !== 'slice9') && <PreviewToggle checked={checkedByToggleId[toggleId]} id={toggleId} key={toggleId} setCheckedByToggleId={setCheckedByToggleId} />)}
      </Box>
      {unavailable && (
        <Typography color="text.secondary" sx={{ left: '50%', position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)' }} variant="body2">
          {t('details.previewUnavailable')}
        </Typography>
      )}
    </Box>
  );
};

export default memo(ImagePreview);
