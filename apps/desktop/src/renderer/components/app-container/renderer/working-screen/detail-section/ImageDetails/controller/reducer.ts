import type { ImageDetailsAction, ImageDetailsState, Slice9 } from './types';

const EMPTY_SLICE9: Slice9 = { bottom: 0, left: 0, right: 0, top: 0 };

export const INITIAL_IMAGE_DETAILS_STATE: ImageDetailsState = {
  alphaThreshold: 1,
  applying: false,
  colorMargin: false,
  croppedHasTransparency: false,
  generatePolygons: false,
  maxPointCount: 32,
  metadataResult: null,
  minimalDistance: 8,
  polygonEditor: null,
  previewVersion: 0,
  slice9: undefined,
  transparentPadding: false
};

export const imageDetailsReducer = (state: ImageDetailsState, action: ImageDetailsAction): ImageDetailsState => {
  switch (action.type) {
    case 'applying-changed':
      return { ...state, applying: action.payload.applying };
    case 'control-changed': {
      const { id, value } = action.payload;
      if (Array.isArray(value)) {
        if (id === 'sliceHorizontal') return { ...state, slice9: { ...(state.slice9 ?? EMPTY_SLICE9), left: value[0], right: value[1] } };
        if (id === 'sliceVertical') return { ...state, slice9: { ...(state.slice9 ?? EMPTY_SLICE9), bottom: value[1], top: value[0] } };
        return state;
      }
      if (typeof value === 'number') {
        switch (id) {
          case 'alphaThreshold': return { ...state, alphaThreshold: value };
          case 'minimalDistance': return { ...state, minimalDistance: value };
          case 'pointCount': return { ...state, maxPointCount: value };
          default: return state;
        }
      }
      switch (id) {
        case 'colorMargin': return { ...state, colorMargin: value, transparentPadding: value ? false : state.transparentPadding };
        case 'slice9': return { ...state, slice9: value ? EMPTY_SLICE9 : undefined };
        case 'transparentPadding': return { ...state, colorMargin: value ? false : state.colorMargin, transparentPadding: value };
        case 'usePolygonsInsteadOfQuads': return { ...state, generatePolygons: value };
        default: return state;
      }
    }
    case 'cropped-transparency-loaded':
      return { ...state, croppedHasTransparency: action.payload.hasTransparency };
    case 'metadata-loaded': {
      const { value } = action.payload;
      return {
        ...state,
        alphaThreshold: value.polygonSettings.alphaThreshold,
        colorMargin: value.polygonSettings.colorMargin,
        generatePolygons: value.hasTransparency && value.supportsTransparency && value.polygonSettings.polygonsApplied,
        maxPointCount: value.polygonSettings.maxPointCount,
        metadataResult: action.payload,
        minimalDistance: value.polygonSettings.minimalDistance,
        slice9: value.polygonSettings.slice9,
        transparentPadding: value.polygonSettings.transparentPadding
      };
    }
    case 'metadata-updated':
      return { ...state, metadataResult: action.payload, previewVersion: state.previewVersion + 1 };
    case 'polygon-editor-closed':
      return { ...state, polygonEditor: null };
    case 'polygon-editor-opened':
      return { ...state, polygonEditor: action.payload };
  }
};
