import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AssetType } from './asset-type';

import { DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME, DEFAULT_FOLDER_ID, INITIAL_PROJECT_VERSION, MAX_U16 } from './constants';
import { createProjectContent, isAssetName } from './content';
import { deleteImportAssetFiles, materializeImportAssetFiles } from './import-asset-file-pool';
import { ProjectConfigProxy } from './project-config-proxy';
import type { FolderConfig, ProjectConfig, ProjectContent, ProjectInfo } from './types';

function getFolderPath(folderId: number, content: ProjectConfig['content']): string {
  const folder = content.find((item) => item.id === folderId && item.type === AssetType.ProjectFolder);
  if (!folder || folder.parentId === 0) return folder?.name ?? '';

  const parentPath = getFolderPath(folder.parentId, content);
  return parentPath ? `${parentPath}/${folder.name}` : folder.name;
}

function toProjectInfo(projectPath: string, config: ProjectConfig): ProjectInfo {
  const folders: FolderConfig[] = config.content
    .filter((item) => item.type === AssetType.ProjectFolder)
    .map((item) => ({
      id: item.id,
      items: config.content.filter((child) => child.parentId === item.id && child.type === AssetType.Bundle).map((child) => String(child.id)),
      name: getFolderPath(item.id, config.content)
    }));
  return { content: config.content, folders, name: config.name, path: projectPath, version: config.version };
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

  return toProjectInfo(projectPath, { content: config.content, name: config.name, version: config.version });
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

export async function createProjectBundleFolder(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addBundleFolder(name, parentId);
}

export async function createProjectTextureAtlas(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addTextureAtlas(name, parentId);
}

const IMAGE_EXTENSIONS = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const FONT_EXTENSIONS = new Set(['.eot', '.otf', '.ttf', '.woff', '.woff2']);

export type ImportProjectAsset = { data?: readonly number[] | Uint8Array; filePath: string; preview?: readonly number[] | Uint8Array };
export type ImportProjectAssetResult = { asset: ProjectContent | null; error: string | null; filePath: string };

type PlannedProjectAsset = {
  assetType: AssetType.Image | AssetType.Font;
  id: number;
  imageData: readonly number[] | Uint8Array | undefined;
  imagePreview: readonly number[] | Uint8Array | undefined;
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
  assets.forEach(({ data, filePath, preview }, index) => {
    try {
      const extension = path.extname(filePath).toLocaleLowerCase();
      const isImage = IMAGE_EXTENSIONS.has(extension);
      const assetType = isImage ? AssetType.Image : FONT_EXTENSIONS.has(extension) ? AssetType.Font : null;
      const fileName = path.basename(filePath);
      const baseName = path.basename(fileName, extension);
      const assetName = baseName.slice(0, 32);
      if (!assetType || !fileName || fileName !== path.basename(fileName) || !isAssetName(assetName)) throw new Error('Asset type is not supported.');
      const imageData = isImage ? data : undefined;
      if (isImage && (!imageData || !imageData.every((item) => Number.isInteger(item) && item >= 0 && item <= 0xff))) throw new Error('Image data is missing or invalid.');
      const imagePreview = isImage ? preview : undefined;
      if (imagePreview && !imagePreview.every((item) => Number.isInteger(item) && item >= 0 && item <= 0xff)) throw new Error('Image preview is invalid.');
      if (nextContentId > MAX_U16) throw new Error('The maximum number of assets has been reached.');

      const name = getUniqueAssetName(assetName, existingNames);
      existingNames.add(name);
      plans.set(index, { assetType, id: nextContentId++, imageData, imagePreview, name });
    } catch (error) {
      planErrors.set(index, error instanceof Error ? error.message : 'Import failed.');
    }
  });

  const fileErrors = await materializeImportAssetFiles(
    Array.from(plans, ([index, plan]) => ({
      assetPath: path.join(projectPath, 'src', 'assets', String(plan.id).padStart(5, '0')),
      filePath: assets[index].filePath,
      imageData: plan.imageData,
      imagePreview: plan.imagePreview,
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

export async function deleteProjectContent(projectPath: string, id: number): Promise<ProjectInfo> {
  const config = await ProjectConfigProxy.load(projectPath);
  const target = config.content.find((item) => item.id === id);
  if (!target || target.type === AssetType.Project || (target.type === AssetType.ProjectFolder && target.parentId === 0)) {
    throw new Error('Content not found.');
  }

  const deletedIds = new Set<number>([id]);
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

  return getProjectInfo(projectPath);
}

export async function renameProjectBundleFolder(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameBundleFolder(id, name);
}

export async function renameProjectTextureAtlas(projectPath: string, id: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).renameTextureAtlas(id, name);
}

export async function createProjectFolder(projectPath: string, parentId: number, name: string): Promise<FolderConfig> {
  const created = await (await ProjectConfigProxy.load(projectPath)).addFolder(name, parentId);
  const folder = (await getProjectInfo(projectPath)).folders.find((item) => item.id === created.id);
  if (!folder) throw new Error('Folder was not created.');
  return folder;
}

export async function renameProjectFolder(projectPath: string, id: number, name: string): Promise<FolderConfig> {
  await (await ProjectConfigProxy.load(projectPath)).renameFolder(id, name);
  const folder = (await getProjectInfo(projectPath)).folders.find((item) => item.id === id);
  if (!folder) throw new Error('Folder was not found.');
  return folder;
}

export async function moveProjectFolder(projectPath: string, id: number, parentId: number): Promise<FolderConfig[]> {
  await (await ProjectConfigProxy.load(projectPath)).moveFolder(id, parentId);
  return (await getProjectInfo(projectPath)).folders;
}
