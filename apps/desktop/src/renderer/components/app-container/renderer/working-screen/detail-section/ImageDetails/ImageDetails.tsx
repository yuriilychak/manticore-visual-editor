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
  const [applying, setApplying] = useState(false);
  const [generatePolygons, setGeneratePolygons] = useState(false);
  const [maxPointCount, setMaxPointCount] = useState(32);
  const [minimalDistance, setMinimalDistance] = useState(8);
  const [showPolygon, setShowPolygon] = useState(false);
  const [showTriangles, setShowTriangles] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [polygonEditor, setPolygonEditor] = useState<{ points: Uint16Array; source: ArrayBuffer } | null>(null);
  const [croppedHasTransparency, setCroppedHasTransparency] = useState(false);
  const [metadataResult, setMetadataResult] = useState<{ id: number; projectPath: string; value: ProjectImageMetadata } | null>(null);
  const metadata = metadataResult?.id === id && metadataResult.projectPath === projectPath ? metadataResult.value : null;
  const canGeneratePolygons = Boolean(metadata?.supportsTransparency && croppedHasTransparency);
  const controlValues: ControlValueById = {
    alphaThreshold,
    pointCount: maxPointCount,
    minimalDistance,
    showTriangles,
    showPolygon,
    usePolygonsInsteadOfQuads: generatePolygons
  };
  const hasConfigurationChanges = Boolean(metadata && (
    alphaThreshold !== metadata.polygonSettings.alphaThreshold ||
    generatePolygons !== metadata.polygonSettings.polygonsApplied ||
    maxPointCount !== metadata.polygonSettings.maxPointCount ||
    minimalDistance !== metadata.polygonSettings.minimalDistance
  ));
  const handleControlChange = useCallback<ControlProps['onChange']>((id, value) => {
    if (typeof value === 'number') {
      const setters = {
        alphaThreshold: setAlphaThreshold,
        pointCount: setMaxPointCount,
        minimalDistance: setMinimalDistance
      };
      setters[id as SliderControlId]?.(value);
    } else {
      const setters = {
        showTriangles: setShowTriangles,
        showPolygon: setShowPolygon,
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
        setGeneratePolygons(value.hasTransparency && value.supportsTransparency && value.polygonSettings.polygonsApplied);
        setMaxPointCount(value.polygonSettings.maxPointCount);
        setMinimalDistance(value.polygonSettings.minimalDistance);
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
        format: metadata.format,
        generatePolygons,
        maxPointCount,
        minimalDistance
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
      <ImagePreview id={id} metadata={metadata} refreshVersion={previewVersion} showPolygon={showPolygon} showTriangles={showTriangles} />
      {metadata && <ImageMetadata metadata={metadata} />}
      <ImageControls canGeneratePolygons={canGeneratePolygons} generatePolygons={generatePolygons} onChange={handleControlChange} values={controlValues} />
      <Box px={1}>
        {generatePolygons && metadata?.polygonSettings.polygons.length ? <Button disabled={applying} onClick={() => void openPolygonEditor()} size="small" sx={{ mr: 1, mt: 2 }} variant="outlined">Modify</Button> : null}
        <Button disabled={!window.manticore?.applyImagePolygonSettings || !window.manticore?.loadImageSource || !hasConfigurationChanges || applying} loading={applying} onClick={() => void applyPolygonSettings()} size="small" sx={{ mt: 2 }} variant="contained">
          {t('common.apply')}
        </Button>
      </Box>
      {polygonEditor && metadata ? <PolygonEditorDialog allPoints={metadata.polygonSettings.polygons.slice(1).map(({ points }) => points.map((point) => point - metadata.polygonSettings.offset))} format={metadata.format} image={polygonEditor.source} maxPointCount={metadata.polygonSettings.maxPointCount} onClose={() => setPolygonEditor(null)} onSubmit={savePolygonEditor} open points={polygonEditor.points} /> : null}
    </Box>
  );
};

export default ImageDetails;
