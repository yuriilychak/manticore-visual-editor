import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FolderConfig, ProjectInfo } from '../types';
import { AssetType } from '../types';

import { DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME, DEFAULT_FOLDER_ID, INITIAL_PROJECT_VERSION } from './constants';
import { createProjectContent, isAssetName } from './content';
import { ProjectConfigProxy } from './project-config-proxy';
import type { ProjectConfig, ProjectContent } from './types';

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
  await Promise.all([mkdir(path.join(sourcePath, 'images')), mkdir(path.join(sourcePath, 'fonts'))]);
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

export async function createProjectBundle(projectPath: string, parentPath: string, name: string): Promise<ProjectContent> {
  const parent = await getFolderByPath(projectPath, parentPath);
  if (!parent) throw new Error('Parent folder not found.');
  return (await ProjectConfigProxy.load(projectPath)).addBundle(name, parent.id);
}

export async function moveProjectBundle(projectPath: string, id: number, targetPath: string): Promise<ProjectContent> {
  const target = await getFolderByPath(projectPath, targetPath);
  if (!target) throw new Error('Target folder not found.');
  return (await ProjectConfigProxy.load(projectPath)).moveBundle(id, target.id);
}

export async function createProjectBundleFolder(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addBundleFolder(name, parentId);
}

export async function createProjectTextureAtlas(projectPath: string, parentId: number, name: string): Promise<ProjectContent> {
  return (await ProjectConfigProxy.load(projectPath)).addTextureAtlas(name, parentId);
}

async function getFolderByPath(projectPath: string, folderPath: string): Promise<FolderConfig | undefined> {
  return (await getProjectInfo(projectPath)).folders.find((folder) => folder.name === folderPath);
}

export async function createProjectFolder(projectPath: string, pathName: string): Promise<FolderConfig> {
  const separator = pathName.lastIndexOf('/');
  const parentPath = separator === -1 ? '' : pathName.slice(0, separator);
  const name = pathName.slice(separator + 1);
  const parent = await getFolderByPath(projectPath, parentPath);
  if (!parent) throw new Error('Parent folder not found.');
  await (await ProjectConfigProxy.load(projectPath)).addFolder(name, parent.id);
  const folder = await getFolderByPath(projectPath, pathName);
  if (!folder) throw new Error('Folder was not created.');
  return folder;
}

export async function renameProjectFolder(projectPath: string, id: number, name: string): Promise<FolderConfig> {
  await (await ProjectConfigProxy.load(projectPath)).renameFolder(id, name);
  const folder = (await getProjectInfo(projectPath)).folders.find((item) => item.id === id);
  if (!folder) throw new Error('Folder was not found.');
  return folder;
}

export async function moveProjectFolder(projectPath: string, id: number, targetPath: string): Promise<FolderConfig[]> {
  const target = await getFolderByPath(projectPath, targetPath);
  if (!target) throw new Error('Target folder not found.');
  await (await ProjectConfigProxy.load(projectPath)).moveFolder(id, target.id);
  return (await getProjectInfo(projectPath)).folders;
}
