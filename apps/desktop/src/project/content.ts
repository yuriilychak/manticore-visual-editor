import { AssetType } from '../types';

import { MAX_U16 } from './constants';
import type { ProjectContent } from './types';

const isU16 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_U16;

export const isAssetName = (value: unknown, allowEmpty = false): value is string =>
  typeof value === 'string' && value.length <= 32 && (allowEmpty || value.length > 0) && /^[\x20-\x7e]*$/.test(value);

export const isProjectContent = (value: unknown): value is ProjectContent => {
  if (typeof value !== 'object' || value === null) return false;

  const { data, id, name, parentId, type, version } = value as Record<string, unknown>;
  return (
    data === null &&
    isU16(id) &&
    isAssetName(name, type === AssetType.ProjectFolder && parentId === 0) &&
    isU16(parentId) &&
    typeof type === 'number' && Number.isInteger(type) && type >= AssetType.Project && type <= AssetType.TextureAtlas &&
    isU16(version)
  );
};

export const createProjectContent = (
  id: number,
  name: string,
  parentId: number,
  type: AssetType,
  version = 0
): ProjectContent => ({ data: null, id, name, parentId, type, version });
