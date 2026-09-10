import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBundle } from './bundle';
import { createFolder } from './folder';
import type { ProjectConfig } from './types';

const DEFAULT_BUNDLE_ID = 0;
const DEFAULT_BUNDLE_NAME = 'default_bundle';

export async function createProject(projectPath: string, name: string): Promise<void> {
  await mkdir(projectPath);

  const sourcePath = path.join(projectPath, 'src');
  await mkdir(sourcePath);

  const bundleDirectoryName = await createBundle(sourcePath, DEFAULT_BUNDLE_ID, DEFAULT_BUNDLE_NAME);
  const config: ProjectConfig = {
    name,
    folders: [createFolder('', [bundleDirectoryName])]
  };
  await writeFile(path.join(sourcePath, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function renameProject(projectPath: string, name: string): Promise<string> {
  const projectName = name.trim();
  if (!projectName) throw new Error('Project name cannot be empty.');

  const configPath = path.join(projectPath, 'src', 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
  if (Array.isArray(config) || config === null) throw new Error('Project configuration is invalid.');

  config.name = projectName;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return projectName;
}
