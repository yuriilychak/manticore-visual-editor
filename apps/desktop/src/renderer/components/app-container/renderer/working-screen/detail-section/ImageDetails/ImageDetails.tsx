import type { ProjectImageMetadata } from '@manticore/project';
import type { ProjectContent } from '@manticore/project/types';
import { ImagePolygonizer } from 'image-polygonizer';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Button } from '@mui/material';

import { useProjectStructure } from '../../../../ProjectStructureContext';

import { createImageUpdate, cropHasTransparency } from './helpers';
import { ImageControls } from './ImageControls';
import type { ControlProps, ControlValueById, SliderControlId, ToggleControlId } from './ImageControls/types';
import { ImageMetadata } from './ImageMetadata';
import { ImagePreview } from './ImagePreview';
import PolygonEditorDialog from './PolygonEditorDialog';

type ImageDetailsProps = {
  item: ProjectContent;
};

const ImageDetails: FC<ImageDetailsProps> = ({ item }) => {
  const { id } = item;
  const { t } = useTranslation();
  const { projectPath } = useProjectStructure();
  const [alphaThreshold, setAlphaThreshold] = useState(1);
  const [colorMargin, setColorMargin] = useState(false);
  const [applying, setApplying] = useState(false);
  const [generatePolygons, setGeneratePolygons] = useState(false);
  const [maxPointCount, setMaxPointCount] = useState(32);
  const [minimalDistance, setMinimalDistance] = useState(8);
  const [slice9, setSlice9] = useState<{ bottom: number; left: number; right: number; top: number } | undefined>();
  const [transparentPadding, setTransparentPadding] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [polygonEditor, setPolygonEditor] = useState<{ points: Uint16Array; source: ArrayBuffer } | null>(null);
  const [croppedHasTransparency, setCroppedHasTransparency] = useState(false);
  const [metadataResult, setMetadataResult] = useState<{ id: number; projectPath: string; value: ProjectImageMetadata } | null>(null);
  const metadata = metadataResult?.id === id && metadataResult.projectPath === projectPath ? metadataResult.value : null;
  const canGeneratePolygons = Boolean(metadata?.supportsTransparency && croppedHasTransparency);
  const controlValues: ControlValueById = {
    alphaThreshold,
    colorMargin,
    pointCount: maxPointCount,
    minimalDistance,
    slice9: Boolean(slice9),
    sliceHorizontal: [slice9?.left ?? 0, slice9?.right ?? 0],
    sliceVertical: [slice9?.top ?? 0, slice9?.bottom ?? 0],
    transparentPadding,
    usePolygonsInsteadOfQuads: generatePolygons
  };
  const hasConfigurationChanges = Boolean(metadata && (
    alphaThreshold !== metadata.polygonSettings.alphaThreshold ||
    colorMargin !== metadata.polygonSettings.colorMargin ||
    generatePolygons !== metadata.polygonSettings.polygonsApplied ||
    maxPointCount !== metadata.polygonSettings.maxPointCount ||
    minimalDistance !== metadata.polygonSettings.minimalDistance
    || JSON.stringify(slice9) !== JSON.stringify(metadata.polygonSettings.slice9)
    || transparentPadding !== metadata.polygonSettings.transparentPadding
  ));
  const handleControlChange = useCallback<ControlProps['onChange']>((id, value) => {
    if (Array.isArray(value)) {
      if (id === 'sliceHorizontal') setSlice9((current) => ({ ...(current ?? { bottom: 0, left: 0, right: 0, top: 0 }), left: value[0], right: value[1] }));
      if (id === 'sliceVertical') setSlice9((current) => ({ ...(current ?? { bottom: 0, left: 0, right: 0, top: 0 }), top: value[0], bottom: value[1] }));
      return;
    }
    if (typeof value === 'number') {
      const setters = {
        alphaThreshold: setAlphaThreshold,
        pointCount: setMaxPointCount,
        minimalDistance: setMinimalDistance
      };
      setters[id as SliderControlId]?.(value);
    } else {
      const setters = {
        colorMargin: (enabled: boolean) => { setColorMargin(enabled); if (enabled) setTransparentPadding(false); },
        slice9: (enabled: boolean) => setSlice9(enabled ? { bottom: 0, left: 0, right: 0, top: 0 } : undefined),
        transparentPadding: (enabled: boolean) => { setTransparentPadding(enabled); if (enabled) setColorMargin(false); },
        usePolygonsInsteadOfQuads: setGeneratePolygons
      };
      setters[id as ToggleControlId]?.(value);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void window.manticore?.loadImageMetadata?.(projectPath, id)
      .then((value) => {
        if (!active) return;
        setAlphaThreshold(value.polygonSettings.alphaThreshold);
        setColorMargin(value.polygonSettings.colorMargin);
        setGeneratePolygons(value.hasTransparency && value.supportsTransparency && value.polygonSettings.polygonsApplied);
        setMaxPointCount(value.polygonSettings.maxPointCount);
        setMinimalDistance(value.polygonSettings.minimalDistance);
        setSlice9(value.polygonSettings.slice9);
        setTransparentPadding(value.polygonSettings.transparentPadding);
        setMetadataResult({ id, projectPath, value });
        void window.manticore?.loadImageSource?.(projectPath, id)
          .then((source) => cropHasTransparency(source, value.format, value.polygonSettings.crop))
          .then((hasTransparency) => { if (active) setCroppedHasTransparency(hasTransparency); })
          .catch(() => { if (active) setCroppedHasTransparency(false); });
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, [id, projectPath]);

  const applyPolygonSettings = async () => {
    const apply = window.manticore?.applyImagePolygonSettings;
    const loadSource = window.manticore?.loadImageSource;
    if (!apply || !loadSource || !metadata) return;

    setApplying(true);
    try {
      const source = await loadSource(projectPath, id);
      const settings = await createImageUpdate(source, {
        alphaThreshold,
        colorMargin,
        format: metadata.format,
        generatePolygons,
        maxPointCount,
        minimalDistance,
        slice9,
        transparentPadding
      });
      const value = await apply(projectPath, id, settings);
      setPreviewVersion((version) => version + 1);
      setMetadataResult({ id, projectPath, value });
    } finally {
      setApplying(false);
    }
  };
  const openPolygonEditor = async () => {
    const polygon = metadata?.polygonSettings.polygons[0];
    const source = await window.manticore?.loadImageSource?.(projectPath, id);
    if (!polygon || !source || !metadata) return;
    setPolygonEditor({ points: polygon.points.map((point) => point - metadata.polygonSettings.offset), source });
  };
  const savePolygonEditor = async (points: Uint16Array) => {
    if (!metadata || !window.manticore?.applyImagePolygonSettings) return;
    setApplying(true);
    const polygonizer = new ImagePolygonizer();
    try {
      await polygonizer.init();
      const updatedPolygons: Array<{ points: Uint16Array; triangles: Uint16Array }> = [];
      for (const { points: original } of metadata.polygonSettings.polygons) {
        const polygonPoints: Uint16Array = updatedPolygons.length ? original.map((point) => point - metadata.polygonSettings.offset) : points;
        const indices = await polygonizer.triangulate(polygonPoints);
        const triangles = new Uint16Array(indices.length / 3);
        for (let index = 0; index < indices.length; index += 3) triangles[index / 3] = (indices[index] << 10) | (indices[index + 1] << 5) | indices[index + 2];
        updatedPolygons.push({ points: polygonPoints, triangles });
      }
      const value = await window.manticore.applyImagePolygonSettings(projectPath, id, { ...metadata.polygonSettings, offset: 0, polygons: updatedPolygons, polygonsApplied: true });
      setMetadataResult({ id, projectPath, value }); setPreviewVersion((version) => version + 1); setPolygonEditor(null);
    } finally { polygonizer.cancel(); setApplying(false); }
  };

  return (
    <Box mt={2}>
      <ImagePreview id={id} metadata={metadata} refreshVersion={previewVersion} slice9={slice9} />
      {metadata && <ImageMetadata metadata={metadata} />}
      <ImageControls canGeneratePolygons={canGeneratePolygons} generatePolygons={generatePolygons} onChange={handleControlChange} sourceHeight={metadata?.croppedHeight ?? 1} sourceWidth={metadata?.croppedWidth ?? 1} values={controlValues} />
      <Box px={1}>
        {generatePolygons && metadata?.polygonSettings.polygons.length && <Button disabled={applying} onClick={() => void openPolygonEditor()} size="small" sx={{ mr: 1, mt: 2 }} variant="outlined">Modify</Button>}
        <Button disabled={!window.manticore?.applyImagePolygonSettings || !window.manticore?.loadImageSource || !hasConfigurationChanges || applying} loading={applying} onClick={() => void applyPolygonSettings()} size="small" sx={{ mt: 2 }} variant="contained">
          {t('common.apply')}
        </Button>
      </Box>
      {polygonEditor && metadata && <PolygonEditorDialog allPoints={metadata.polygonSettings.polygons.slice(1).map(({ points }) => points.map((point) => point - metadata.polygonSettings.offset))} format={metadata.format} image={polygonEditor.source} maxPointCount={metadata.polygonSettings.maxPointCount} onClose={() => setPolygonEditor(null)} onSubmit={savePolygonEditor} open points={polygonEditor.points} />}
    </Box>
  );
};

export default ImageDetails;
