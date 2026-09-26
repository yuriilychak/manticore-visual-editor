import { AssetType } from './asset-type';

import { MAX_U16 } from './constants';
import type { ProjectContent } from './types';

const isU16 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_U16;

const isLegacyAssetData = (value: unknown): value is number[] | string =>
  (typeof value === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0) ||
  (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 0xff));

export const isAssetName = (value: unknown, allowEmpty = false): value is string =>
  typeof value === 'string' && value.length <= 32 && (allowEmpty || value.length > 0) && /^[\x20-\x7e]*$/.test(value);

export const isProjectContent = (value: unknown): value is ProjectContent => {
  if (typeof value !== 'object' || value === null) return false;

  const { data, id, name, parentId, type, version } = value as Record<string, unknown>;
  return (
    (data === undefined || data === null || (type === AssetType.Image && isLegacyAssetData(data))) &&
    isU16(id) &&
    isAssetName(name, type === AssetType.ProjectFolder && parentId === 0) &&
    isU16(parentId) &&
    typeof type === 'number' && Number.isInteger(type) && type >= AssetType.Project && type <= AssetType.Font &&
    isU16(version)
  );
};

export const createProjectContent = (
  id: number,
  name: string,
  parentId: number,
  type: AssetType,
  version = 0
): ProjectContent => ({ id, name, parentId, type, version });
