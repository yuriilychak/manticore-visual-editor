import type { ProjectImageMetadata } from '@manticore/project';
import { useCallback, useEffect, useReducer, useState } from 'react';

import { useProjectStructure } from '../../../../../ProjectStructureContext';

import type { ControlProps, ControlValueById } from '../ImageControls/types';

import { createImageUpdate, loadCroppedHasTransparency } from './helpers';
import { imageDetailsReducer, INITIAL_IMAGE_DETAILS_STATE } from './reducer';

const useMultipleImageDetails = (imageIds: readonly number[]) => {
  const { projectPath } = useProjectStructure();
  const [state, dispatch] = useReducer(imageDetailsReducer, INITIAL_IMAGE_DETAILS_STATE);
  const [canGeneratePolygons, setCanGeneratePolygons] = useState(false);
  const [hasConfigurationChanges, setHasConfigurationChanges] = useState(false);
  const [previewMetadata, setPreviewMetadata] = useState<ProjectImageMetadata | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [processedImageCount, setProcessedImageCount] = useState(0);
  const [sourceSize, setSourceSize] = useState({ height: 1, width: 1 });
  const previewImageId = imageIds.at(-1) ?? 0;
  const { alphaThreshold, applying, colorMargin, generatePolygons, maxPointCount, minimalDistance, slice9, transparentPadding } = state;
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
  const handleControlChange = useCallback<ControlProps['onChange']>((id, value) => {
    dispatch({ type: 'control-changed', payload: { id, value } });
    setHasConfigurationChanges(true);
  }, []);

  useEffect(() => {
    const request = { active: true };
    void Promise.all(imageIds.map(async (id) => {
      const metadata = await window.manticore?.loadImageMetadata?.(projectPath, id);
      if (!metadata) return null;
      const hasTransparency = await loadCroppedHasTransparency(projectPath, id, metadata.format, metadata.polygonSettings.crop, request);
      return { canGeneratePolygons: metadata.supportsTransparency && hasTransparency, height: metadata.croppedHeight, metadata, width: metadata.croppedWidth };
    }))
      .then((values) => {
        if (!request.active || values.some((value) => !value)) return;
        const metadata = values.filter((value): value is NonNullable<typeof value> => Boolean(value));
        setCanGeneratePolygons(metadata.every(({ canGeneratePolygons }) => canGeneratePolygons));
        setPreviewMetadata(metadata.at(-1)?.metadata ?? null);
        setSourceSize({ height: Math.min(...metadata.map(({ height }) => height)), width: Math.min(...metadata.map(({ width }) => width)) });
      })
      .catch(() => undefined);

    return () => { request.active = false; };
  }, [imageIds, projectPath]);

  const applyPolygonSettings = useCallback(async () => {
    const apply = window.manticore?.applyImagePolygonSettings;
    const loadSource = window.manticore?.loadImageSource;
    const loadMetadata = window.manticore?.loadImageMetadata;
    if (!apply || !loadSource || !loadMetadata || !hasConfigurationChanges) return;

    dispatch({ type: 'applying-changed', payload: { applying: true } });
    setProcessedImageCount(0);
    try {
      const results = await Promise.allSettled(imageIds.map(async (id) => {
        try {
          const [metadata, source] = await Promise.all([loadMetadata(projectPath, id), loadSource(projectPath, id)]);
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
          const updatedMetadata = await apply(projectPath, id, settings);
          if (id === previewImageId) setPreviewMetadata(updatedMetadata);
        } finally {
          setProcessedImageCount((count) => count + 1);
        }
      }));
      const failedResult = results.find((result) => result.status === 'rejected');
      if (failedResult?.status === 'rejected') throw failedResult.reason;
      setHasConfigurationChanges(false);
      setPreviewVersion((version) => version + 1);
    } finally {
      dispatch({ type: 'applying-changed', payload: { applying: false } });
    }
  }, [alphaThreshold, colorMargin, generatePolygons, hasConfigurationChanges, imageIds, maxPointCount, minimalDistance, previewImageId, projectPath, slice9, transparentPadding]);

  return {
    applying,
    canApplyPolygonSettings: Boolean(window.manticore?.applyImagePolygonSettings && window.manticore?.loadImageMetadata && window.manticore?.loadImageSource && hasConfigurationChanges && !applying),
    canGeneratePolygons,
    controlValues,
    handleControlChange,
    applyPolygonSettings,
    generatePolygons,
    previewImageId,
    previewMetadata,
    previewVersion,
    processedImageCount,
    sourceHeight: sourceSize.height,
    sourceWidth: sourceSize.width
  };
};

export default useMultipleImageDetails;
