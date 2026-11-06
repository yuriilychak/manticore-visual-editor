import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AssetType } from './asset-type';

import { DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME, DEFAULT_FOLDER_ID, INITIAL_PROJECT_VERSION, MAX_U16 } from './constants';
import { createProjectContent, isAssetName } from './content';
import { readProjectImageMetadata, type ProjectImageMetadata } from './image-metadata';
import { createQuadPolygonSettings, deserializeProjectImagePolygonSettings, serializeProjectImagePolygonSettings, type ProjectImagePolygonSettings, type ProjectImagePolygonSettingsInput } from './image-polygon-settings';
import { deleteImportAssetFiles, materializeImportAssetFiles } from './import-asset-file-pool';
import { ProjectConfigProxy } from './project-config-proxy';
import type { ProjectConfig, ProjectContent, ProjectInfo } from './types';

function toProjectInfo(projectPath: string, config: ProjectConfig): ProjectInfo {
  return { content: config.content, name: config.name, path: projectPath, version: config.version };
}

export async function createProject(projectPath: string, name: string): Promise<void> {
  if (!isAssetName(name)) throw new Error('Project name must be 1 to 32 printable ASCII characters.');
  await mkdir(projectPath);

  const sourcePath = path.join(projectPath, 'src');
  await mkdir(sourcePath);
  const config: ProjectConfig = {
    content: [
      createProjectContent(DEFAULT_FOLDER_ID, '', 0, AssetType.ProjectFolder),
      createProjectContent(DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME, DEFAULT_FOLDER_ID, AssetType.Bundle)
    ],
    name,
    version: INITIAL_PROJECT_VERSION
  };
  await writeFile(path.join(sourcePath, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function getProjectInfo(projectPath: string): Promise<ProjectInfo> {
  const config = await ProjectConfigProxy.load(projectPath);
  await migrateProjectImageAssets(projectPath, config.content);

  return toProjectInfo(projectPath, { content: config.content, name: config.name, version: config.version });
}

type LegacyImageAsset = { format: string; height: number; pixels: Uint8Array; width: number };

const readLegacyImageAsset = (data: Uint8Array): LegacyImageAsset => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  const readString = () => {
    if (offset + 2 > data.byteLength) throw new Error('Image asset is invalid.');
    const length = view.getUint16(offset, true);
    offset += 2;
    if (offset + length > data.byteLength) throw new Error('Image asset is invalid.');
    const value = new TextDecoder().decode(data.subarray(offset, offset + length));
    offset += length;
    return value;
  };
  readString();
  readString();
  const format = readString();
  offset += 25;
  if (offset + 4 > data.byteLength) throw new Error('Image asset is invalid.');
  const polygonLength = view.getUint32(offset, true);
  offset += 4 + polygonLength * 2;
  if (offset + 8 > data.byteLength) throw new Error('Image asset is invalid.');
  const width = view.getUint32(offset, true);
  const height = view.getUint32(offset + 4, true);
  offset += 8;
  if (!width || !height || offset + width * height * 4 > data.byteLength) throw new Error('Image asset is invalid.');
  return { format, height, pixels: data.subarray(offset, offset + width * height * 4), width };
};

const getLegacyCrop = ({ height, pixels, width }: LegacyImageAsset) => {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
    if (pixels[(y * width + x) * 4 + 3] <= 1) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return maxX < 0 ? { height, width, x: 0, y: 0 } : { height: maxY - minY + 1, width: maxX - minX + 1, x: minX, y: minY };
};

/** Convert legacy persisted RGBA/preview payloads to the settings-only layout. */
async function migrateProjectImageAssets(projectPath: string, content: readonly ProjectContent[]): Promise<void> {
  await Promise.all(content.filter(({ type }) => type === AssetType.Image).map(async ({ id }) => {
    const assetPath = path.join(projectPath, 'src', 'assets', String(id).padStart(5, '0'));
    const settingsPath = path.join(assetPath, 'polygon-settings');
    try {
      await readFile(settingsPath).then(deserializeProjectImagePolygonSettings);
    } catch {
      const legacy = readLegacyImageAsset(await readFile(path.join(assetPath, 'asset')));
      const settings = createQuadPolygonSettings({
        alphaThreshold: 1, crop: getLegacyCrop(legacy), maxPointCount: 32, minimalDistance: 8, polygonsApplied: false
      }, { format: legacy.format, height: legacy.height, width: legacy.width });
      await writeFile(settingsPath, serializeProjectImagePolygonSettings(settings));
    }
    await Promise.all([rm(path.join(assetPath, 'asset'), { force: true }), rm(path.join(assetPath, 'preview'), { force: true })]);
  }));
}

export async function loadProjectImageSource(projectPath: string, id: number): Promise<ArrayBuffer> {
  if (!Number.isInteger(id) || id < 0 || id > MAX_U16) throw new Error('Image ID is invalid.');
  const config = await ProjectConfigProxy.load(projectPath);
  if (!config.content.some((item) => item.id === id && item.type === AssetType.Image)) throw new Error('Image is not in the project.');
  const content = await readFile(path.join(projectPath, 'src', 'assets', String(id).padStart(5, '0'), 'source'));
  return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
}

export async function loadProjectImageMetadata(projectPath: string, id: number): Promise<ProjectImageMetadata> {
  if (!Number.isInteger(id) || id < 0 || id > MAX_U16) throw new Error('Image ID is invalid.');
  const config = await ProjectConfigProxy.load(projectPath);
  if (!config.content.some((item) => item.id === id && item.type === AssetType.Image)) throw new Error('Image is not in the project.');

  const assetPath = path.join(projectPath, 'src', 'assets', String(id).padStart(5, '0'));
  const [sourceStats, settings] = await Promise.all([
    stat(path.join(assetPath, 'source')),
    readFile(path.join(assetPath, 'polygon-settings')).then(deserializeProjectImagePolygonSettings)
  ]);
  return readProjectImageMetadata(sourceStats.size, settings);
}

export async function applyProjectImagePolygonSettings(projectPath: string, id: number, settings: ProjectImagePolygonSettingsInput): Promise<ProjectImageMetadata> {
  if (!Number.isInteger(id) || id < 0 || id > MAX_U16) throw new Error('Image ID is invalid.');
  const config = await ProjectConfigProxy.load(projectPath);
  if (!config.content.some((item) => item.id === id && item.type === AssetType.Image)) throw new Error('Image is not in the project.');

  const assetPath = path.join(projectPath, 'src', 'assets', String(id).padStart(5, '0'));
  const updatedSettings: ProjectImagePolygonSettings = { ...settings, colorMargin: settings.colorMargin ?? false, offset: settings.offset ?? 0, polygons: settings.polygons ?? [], transparentPadding: settings.transparentPadding ?? false };
  const [sourceStats] = await Promise.all([
    stat(path.join(assetPath, 'source')),
    writeFile(path.join(assetPath, 'polygon-settings'), serializeProjectImagePolygonSettings(updatedSettings))
  ]);
  return readProjectImageMetadata(sourceStats.size, updatedSettings);
}

export async function renameProject(projectPath: string, name: string): Promise<string> {
  return (await ProjectConfigProxy.load(projectPath)).renameProject(name);
}

export async function renameProjectBundle(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameBundle(id, name);
}

export async function createProjectBundle(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addBundle(name, parentId);
}

export async function moveProjectBundle(projectPath: string, id: number, parentId: number): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).moveBundle(id, parentId);
}

export async function moveProjectContent(projectPath: string, id: number, parentId: number): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).moveContent(id, parentId);
}

export async function duplicateProjectContent(projectPath: string, ids: readonly number[], targetParentId?: number): Promise<ProjectContent[]> {
  const config = await ProjectConfigProxy.load(projectPath);
  const sourceIds = new Set(ids);
  const selectedContent = config.content.filter(({ id }) => sourceIds.has(id));
  const roots = selectedContent.filter(({ parentId }) => !sourceIds.has(parentId));
  const sourceContent: ProjectContent[] = [];
  const pending = [...roots];
  for (const source of pending) {
    sourceContent.push(source);
    pending.push(...config.content.filter((item) => item.parentId === source.id));
  }
  const sourceAssets = sourceContent.filter(({ type }) => type === AssetType.Image || type === AssetType.Font);
  const copied = await config.duplicateContent(ids, targetParentId, false);
  const copiedAssets = copied.filter(({ type }) => type === AssetType.Image || type === AssetType.Font);
  if (sourceAssets.length !== copiedAssets.length) throw new Error('Could not duplicate asset content.');

  try {
    const results = await Promise.allSettled(sourceAssets.map((source, index) => cp(
      path.join(projectPath, 'src', 'assets', String(source.id).padStart(5, '0')),
      path.join(projectPath, 'src', 'assets', String(copiedAssets[index]!.id).padStart(5, '0')),
      { errorOnExist: true, force: false, recursive: true }
    )));
    const failedCopy = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failedCopy) throw failedCopy.reason;
    await config.save();
    return copied;
  } catch (error) {
    await Promise.all(copiedAssets.map(({ id }) => rm(path.join(projectPath, 'src', 'assets', String(id).padStart(5, '0')), { force: true, recursive: true })));
    throw error;
  }
}

export async function createProjectBundleFolder(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addBundleFolder(name, parentId);
}

export async function createProjectTextureAtlas(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addTextureAtlas(name, parentId);
}

const IMAGE_EXTENSIONS = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const FONT_EXTENSIONS = new Set(['.eot', '.otf', '.ttf', '.woff', '.woff2']);

export type ImportProjectAsset = { filePath: string; polygonSettings?: readonly number[] | Uint8Array };
export type ImportProjectAssetResult = { asset: ProjectContent | null; error: string | null; filePath: string };

type PlannedProjectAsset = {
  assetType: AssetType.Image | AssetType.Font;
  id: number;
  imageSettings: readonly number[] | Uint8Array | undefined;
  name: string;
};

const getUniqueAssetName = (name: string, existingNames: ReadonlySet<string>): string => {
  for (let index = 0; ; ++index) {
    const suffix = index ? ` (${index})` : '';
    const candidate = `${name.slice(0, 32 - suffix.length)}${suffix}`;
    if (!existingNames.has(candidate)) return candidate;
  }
};

export async function importProjectAssets(projectPath: string, bundleId: number, assets: readonly ImportProjectAsset[], onResult: (result: ImportProjectAssetResult) => void = () => undefined): Promise<ImportProjectAssetResult[]> {
  const config = await ProjectConfigProxy.load(projectPath);
  if (!config.content.some((item) => item.id === bundleId && item.type === AssetType.Bundle)) throw new Error('Bundle not found.');

  const existingNames = new Set(config.content.filter((item) => item.parentId === bundleId).map((item) => item.name));
  const plans = new Map<number, PlannedProjectAsset>();
  const planErrors = new Map<number, string>();
  let nextContentId = Math.max(0, ...config.content.map((item) => item.id)) + 1;

  // Reserve all names and IDs before creating files, so the file phase is only
  // responsible for materializing an already-determined import plan.
  assets.forEach(({ filePath, polygonSettings }, index) => {
    try {
      const extension = path.extname(filePath).toLocaleLowerCase();
      const isImage = IMAGE_EXTENSIONS.has(extension);
      const assetType = isImage ? AssetType.Image : FONT_EXTENSIONS.has(extension) ? AssetType.Font : null;
      const fileName = path.basename(filePath);
      const baseName = path.basename(fileName, extension);
      const assetName = baseName.slice(0, 32);
      if (!assetType || !fileName || fileName !== path.basename(fileName) || !isAssetName(assetName)) throw new Error('Asset type is not supported.');
      const imageSettings = isImage ? polygonSettings : undefined;
      if (isImage && (!imageSettings || !imageSettings.every((item) => Number.isInteger(item) && item >= 0 && item <= 0xff))) throw new Error('Image polygon settings are missing or invalid.');
      if (imageSettings) deserializeProjectImagePolygonSettings(new Uint8Array(imageSettings));
      if (nextContentId > MAX_U16) throw new Error('The maximum number of assets has been reached.');

      const name = getUniqueAssetName(assetName, existingNames);
      existingNames.add(name);
      plans.set(index, { assetType, id: nextContentId++, imageSettings, name });
    } catch (error) {
      planErrors.set(index, error instanceof Error ? error.message : 'Import failed.');
    }
  });

  const fileErrors = await materializeImportAssetFiles(
    Array.from(plans, ([index, plan]) => ({
      assetPath: path.join(projectPath, 'src', 'assets', String(plan.id).padStart(5, '0')),
      filePath: assets[index].filePath,
      imageSettings: plan.imageSettings,
      index
    }))
  );

  const results: ImportProjectAssetResult[] = [];
  for (const [index, { filePath }] of assets.entries()) {
    const plan = plans.get(index);
    if (!plan) {
      const result = { asset: null, error: planErrors.get(index) ?? 'Import failed.', filePath };
      results.push(result);
      onResult(result);
      continue;
    }

    try {
      const fileError = fileErrors.get(index);
      if (fileError) throw new Error(fileError);
      const asset = await config.addAsset(plan.name, bundleId, plan.assetType, plan.id);
      const result = { asset, error: null, filePath };
      results.push(result);
      onResult(result);
    } catch (error) {
      await rm(path.join(projectPath, 'src', 'assets', String(plan.id).padStart(5, '0')), { force: true, recursive: true });
      const result = { asset: null, error: error instanceof Error ? error.message : 'Import failed.', filePath };
      results.push(result);
      onResult(result);
    }
  }

  return results;
}

export async function deleteProjectContent(projectPath: string, ids: readonly number[]): Promise<number[]> {
  const config = await ProjectConfigProxy.load(projectPath);
  const deletedIds = new Set(ids);
  const targets = config.content.filter((item) => deletedIds.has(item.id));
  if (!targets.length || targets.length !== deletedIds.size || targets.some((item) =>
    item.type === AssetType.Project || (item.type === AssetType.ProjectFolder && item.parentId === 0)
  )) {
    throw new Error('Content not found.');
  }

  // Keep collecting so child ordering in the manifest does not affect the
  // recursively deleted subtree.
  for (let previousSize = 0; previousSize !== deletedIds.size; previousSize = deletedIds.size) {
    config.content.forEach((item) => {
      if (deletedIds.has(item.parentId)) deletedIds.add(item.id);
    });
  }

  const assetPaths = config.content
    .filter((item) => deletedIds.has(item.id) && (item.type === AssetType.Image || item.type === AssetType.Font))
    .map((item) => path.join(projectPath, 'src', 'assets', String(item.id).padStart(5, '0')));
  await deleteImportAssetFiles(assetPaths);
  await config.deleteContent(deletedIds);

  return [...deletedIds];
}

export async function renameProjectBundleFolder(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameBundleFolder(id, name);
}

export async function renameProjectTextureAtlas(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameTextureAtlas(id, name);
}

export async function createProjectFolder(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addFolder(name, parentId);
}

export async function renameProjectFolder(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameFolder(id, name);
}

export async function moveProjectFolder(projectPath: string, id: number, parentId: number): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).moveFolder(id, parentId);
}
