import type { ProjectContent } from '@manticore/project/types';
import { ImagePolygonizer } from 'image-polygonizer';
import { type MouseEvent, useCallback, useEffect, useReducer } from 'react';

import { useProjectStructure } from '../../../../../ProjectStructureContext';

import type { ControlProps, ControlValueById } from '../ImageControls/types';

import { createImageUpdate, createTriangulatedPolygons, getPolygonCrop, getPolygonOffset, loadCroppedHasTransparency, toEditorPoints, toStoredPoints } from './helpers';
import { imageDetailsReducer, INITIAL_IMAGE_DETAILS_STATE } from './reducer';

const useImageDetails = ({ id }: ProjectContent) => {
  const { projectPath } = useProjectStructure();
  const [state, dispatch] = useReducer(imageDetailsReducer, INITIAL_IMAGE_DETAILS_STATE);
  const {
    alphaThreshold,
    applying,
    colorMargin,
    croppedHasTransparency,
    generatePolygons,
    maxPointCount,
    metadataResult,
    minimalDistance,
    polygonEditor,
    previewVersion,
    slice9,
    transparentPadding
  } = state;
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
  const handleControlChange = useCallback<ControlProps['onChange']>((id, value) => dispatch({ type: 'control-changed', payload: { id, value } }), []);

  useEffect(() => {
    const request = { active: true };
    void window.manticore?.loadImageMetadata?.(projectPath, id)
      .then(async (value) => {
        if (!request.active) return;
        dispatch({ type: 'metadata-loaded', payload: { id, projectPath, value } });
        const hasTransparency = await loadCroppedHasTransparency(projectPath, id, value.format, value.polygonSettings.crop, request);
        if (request.active) dispatch({ type: 'cropped-transparency-loaded', payload: { hasTransparency } });
      })
      .catch(() => undefined);

    return () => { request.active = false; };
  }, [id, projectPath]);

  const applyPolygonSettings = useCallback(async () => {
    const apply = window.manticore?.applyImagePolygonSettings;
    const loadSource = window.manticore?.loadImageSource;
    if (!apply || !loadSource || !metadata) return;

    dispatch({ type: 'applying-changed', payload: { applying: true } });
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
      dispatch({ type: 'metadata-updated', payload: { id, projectPath, value } });
    } finally {
      dispatch({ type: 'applying-changed', payload: { applying: false } });
    }
  }, [alphaThreshold, colorMargin, generatePolygons, id, maxPointCount, metadata, minimalDistance, projectPath, slice9, transparentPadding]);
  const openPolygonEditor = useCallback(async () => {
    const source = await window.manticore?.loadImageSource?.(projectPath, id);
    if (!source || !metadata?.polygonSettings.polygons.length) return;
    dispatch({ type: 'polygon-editor-opened', payload: { source } });
  }, [id, metadata, projectPath]);
  const savePolygonEditor = async (selectedPolygonIndex: number, points: Int16Array) => {
    if (!metadata || !window.manticore?.applyImagePolygonSettings) return;
    dispatch({ type: 'applying-changed', payload: { applying: true } });
    const polygonizer = new ImagePolygonizer();
    try {
      await polygonizer.init();
      const editorPolygons = metadata.polygonSettings.polygons.map(({ points: original }, index) => (
        index === selectedPolygonIndex ? points : toEditorPoints(original, metadata.polygonSettings.offset)
      ));
      const offset = getPolygonOffset(editorPolygons);
      const updatedPolygons = await createTriangulatedPolygons(polygonizer, editorPolygons.map((polygon) => toStoredPoints(polygon, offset)));
      const value = await window.manticore.applyImagePolygonSettings(projectPath, id, {
        ...metadata.polygonSettings,
        crop: getPolygonCrop(editorPolygons),
        offset,
        polygons: updatedPolygons,
        polygonsApplied: true
      });
      dispatch({ type: 'metadata-updated', payload: { id, projectPath, value } });
      dispatch({ type: 'polygon-editor-closed' });
    } finally {
      polygonizer.cancel();
      dispatch({ type: 'applying-changed', payload: { applying: false } });
    }
  };
  const deletePolygonEditor = async (selectedPolygonIndex: number) => {
    if (!metadata || !window.manticore?.applyImagePolygonSettings || metadata.polygonSettings.polygons.length <= 1) return;
    dispatch({ type: 'applying-changed', payload: { applying: true } });
    try {
      const polygons = metadata.polygonSettings.polygons.filter((_, index) => index !== selectedPolygonIndex);
      const value = await window.manticore.applyImagePolygonSettings(projectPath, id, { ...metadata.polygonSettings, polygons, polygonsApplied: true });
      dispatch({ type: 'metadata-updated', payload: { id, projectPath, value } });
    } finally {
      dispatch({ type: 'applying-changed', payload: { applying: false } });
    }
  };
  const closePolygonEditor = useCallback(() => dispatch({ type: 'polygon-editor-closed' }), []);
  const polygonEditorDialog = polygonEditor && metadata ? {
    format: metadata.format,
    image: polygonEditor.source,
    maxPointCount: metadata.polygonSettings.maxPointCount,
    onClose: closePolygonEditor,
    onDelete: deletePolygonEditor,
    onSubmit: savePolygonEditor,
    open: true,
    polygons: metadata.polygonSettings.polygons.map(({ points }) => toEditorPoints(points, metadata.polygonSettings.offset))
  } : null;
  const handleButtonClick = useCallback(({ currentTarget }: MouseEvent<HTMLButtonElement>) => {
    switch (currentTarget.id) {
      case 'apply':
        void applyPolygonSettings();
        break;
      case 'modify':
        void openPolygonEditor();
        break;
    }
  }, [applyPolygonSettings, openPolygonEditor]);

  return {
    applying,
    canApplyPolygonSettings: Boolean(window.manticore?.applyImagePolygonSettings && window.manticore?.loadImageSource && hasConfigurationChanges && !applying),
    canGeneratePolygons,
    canModifyPolygons: Boolean(generatePolygons && metadata?.polygonSettings.polygons.length),
    controlValues,
    generatePolygons,
    handleButtonClick,
    handleControlChange,
    metadata,
    polygonEditorDialog,
    previewVersion,
    slice9
  };
};

export default useImageDetails;
