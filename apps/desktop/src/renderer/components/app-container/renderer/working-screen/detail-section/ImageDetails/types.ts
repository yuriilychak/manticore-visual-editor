import type { ProjectImageMetadata } from '@manticore/project';

import type { ControlId, ControlValue } from './ImageControls/types';

export type Slice9 = { bottom: number; left: number; right: number; top: number };

export type PolygonEditorState = { points: Uint16Array; source: ArrayBuffer };

export type MetadataResult = { id: number; projectPath: string; value: ProjectImageMetadata };

export type ImageDetailsState = {
  alphaThreshold: number;
  applying: boolean;
  colorMargin: boolean;
  croppedHasTransparency: boolean;
  generatePolygons: boolean;
  maxPointCount: number;
  metadataResult: MetadataResult | null;
  minimalDistance: number;
  polygonEditor: PolygonEditorState | null;
  previewVersion: number;
  slice9?: Slice9;
  transparentPadding: boolean;
};

export type ImageDetailsAction =
  | { type: 'applying-changed'; payload: { applying: boolean } }
  | { type: 'control-changed'; payload: { id: ControlId; value: ControlValue } }
  | { type: 'cropped-transparency-loaded'; payload: { hasTransparency: boolean } }
  | { type: 'metadata-loaded'; payload: MetadataResult }
  | { type: 'metadata-updated'; payload: MetadataResult }
  | { type: 'polygon-editor-closed' }
  | { type: 'polygon-editor-opened'; payload: PolygonEditorState };
