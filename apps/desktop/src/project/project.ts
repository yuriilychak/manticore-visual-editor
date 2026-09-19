import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BundleConfig, FolderConfig, ProjectInfo } from '../types';

import { createBundle, getProjectBundle } from './bundle';
import { DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME, DEFAULT_FOLDER_ID } from './constants';
import { createFolder } from './folder';
import { ProjectConfigProxy } from './project-config-proxy';
import type { ProjectConfig } from './types';

async function getProjectBundles(sourcePath: string): Promise<Map<string, BundleConfig>> {
  const entries = await readdir(sourcePath, { withFileTypes: true });
  const bundleConfigs = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => getProjectBundle(path.join(sourcePath, entry.name)))
  );
  const bundles = new Map<string, BundleConfig>();

  for (const config of bundleConfigs) {
    if (bundles.has(config.id)) throw new Error('Bundle configuration is invalid.');
    bundles.set(config.id, config);
  }

  return bundles;
}

export async function createProject(projectPath: string, name: string): Promise<void> {
  await mkdir(projectPath);

  const sourcePath = path.join(projectPath, 'src');
  await mkdir(sourcePath);

  const bundleDirectoryName = await createBundle(sourcePath, DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME);
  const config: ProjectConfig = {
    name,
    folders: [createFolder(DEFAULT_FOLDER_ID, '', [bundleDirectoryName])]
  };
  await writeFile(path.join(sourcePath, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function getProjectInfo(projectPath: string): Promise<ProjectInfo> {
  const sourcePath = path.join(projectPath, 'src');
  const config = await ProjectConfigProxy.load(projectPath);

  return {
    bundles: await getProjectBundles(sourcePath),
    folders: config.folders,
    name: config.name,
    path: projectPath
  };
}

export async function createProjectFolder(projectPath: string, name: string): Promise<FolderConfig> {
  return (await ProjectConfigProxy.load(projectPath)).addFolder(name);
}

export async function renameProjectFolder(projectPath: string, id: number, name: string): Promise<FolderConfig> {
  return (await ProjectConfigProxy.load(projectPath)).renameFolder(id, name);
}

export async function renameProject(projectPath: string, name: string): Promise<string> {
  return (await ProjectConfigProxy.load(projectPath)).renameProject(name);
}
