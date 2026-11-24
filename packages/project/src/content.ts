import { AssetType } from './asset-type';

import { MAX_U16 } from './constants';
import type { ProjectContent, ProjectContentType, ProjectTextureAtlasQuad } from './types';

const isU16 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_U16;

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

const isLegacyAssetData = (value: unknown): value is number[] | string =>
  (typeof value === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0) ||
  (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 0xff));

export const isAssetName = (value: unknown, allowEmpty = false): value is string =>
  typeof value === 'string' && value.length <= 32 && (allowEmpty || value.length > 0) && /^[\x20-\x7e]*$/.test(value);

const isTextureAtlasQuad = (value: unknown): value is ProjectTextureAtlasQuad => {
  if (typeof value !== 'object' || value === null) return false;
  const { height, items, outdated, width } = value as Record<string, unknown>;
  return typeof outdated === 'boolean'
    && isU16(width) && isU16(height) && width === height && width > 0 && (width & (width - 1)) === 0
    && Array.isArray(items) && items.every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const { id, localX, localY, polygonIndex, rotated, rotation, x, y } = item as Record<string, unknown>;
      return isU16(id) && isU16(x) && isU16(y) && typeof rotated === 'boolean'
        && (localX === undefined || isInteger(localX)) && (localY === undefined || isInteger(localY))
        && (polygonIndex === undefined || isU16(polygonIndex))
        && (rotation === undefined || rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270);
    });
};

export const isProjectContent = (value: unknown): value is ProjectContent => {
  if (typeof value !== 'object' || value === null) return false;

  const { data, id, name, parentId, quad, type, version } = value as Record<string, unknown>;
  return (
    (data === undefined || data === null || (type === AssetType.Image && isLegacyAssetData(data))) &&
    (quad === undefined || (type === AssetType.TextureAtlas && isTextureAtlasQuad(quad))) &&
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
  type: ProjectContentType,
  version = 0
): ProjectContent => ({ id, name, parentId, type, version });
