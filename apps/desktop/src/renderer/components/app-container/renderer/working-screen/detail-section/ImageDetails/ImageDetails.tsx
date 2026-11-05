import type { ProjectImageMetadata } from '@manticore/project';
import type { ProjectContent } from '@manticore/project/types';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Button } from '@mui/material';

import { useProjectStructure } from '../../../../ProjectStructureContext';

import { createImageUpdate } from './helpers';
import { ImageControls } from './ImageControls';
import type { ControlProps, ControlValueById, SliderControlId, ToggleControlId } from './ImageControls/types';
import { ImageMetadata } from './ImageMetadata';
import { ImagePreview } from './ImagePreview';

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
  const [metadataResult, setMetadataResult] = useState<{ id: number; projectPath: string; value: ProjectImageMetadata } | null>(null);
  const metadata = metadataResult?.id === id && metadataResult.projectPath === projectPath ? metadataResult.value : null;
  const canGeneratePolygons = Boolean(metadata?.hasTransparency && metadata.supportsTransparency);
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

  return (
    <Box mt={2}>
      <ImagePreview id={id} metadata={metadata} refreshVersion={previewVersion} showPolygon={showPolygon} showTriangles={showTriangles} />
      {metadata && <ImageMetadata metadata={metadata} />}
      <ImageControls canGeneratePolygons={canGeneratePolygons} generatePolygons={generatePolygons} onChange={handleControlChange} values={controlValues} />
      <Box px={1}>
      <Button disabled={!window.manticore?.applyImagePolygonSettings || !window.manticore?.loadImageSource || !hasConfigurationChanges || applying} loading={applying} onClick={() => void applyPolygonSettings()} size="small" sx={{ mt: 2 }} variant="contained">
          {t('common.apply')}
        </Button>
      </Box>
    </Box>
  );
};

export default ImageDetails;
