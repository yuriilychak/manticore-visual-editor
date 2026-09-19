import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FolderConfig } from '../types';

import { MAX_U16 } from './constants';
import { createFolder, isFolderConfig } from './folder';
import type { ProjectConfig } from './types';

export class ProjectConfigProxy {
  static async load(projectPath: string): Promise<ProjectConfigProxy> {
    const configPath = path.join(projectPath, 'src', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8')) as { folders?: unknown; name?: unknown };
    if (
      typeof config.name !== 'string' ||
      !config.name ||
      !Array.isArray(config.folders) ||
      !config.folders.every(isFolderConfig)
    ) {
      throw new Error('Project configuration is invalid.');
    }

    return new ProjectConfigProxy(configPath, config as ProjectConfig);
  }

  private constructor(
    private readonly configPath: string,
    private readonly config: ProjectConfig
  ) {}

  get folders(): FolderConfig[] {
    return this.config.folders;
  }

  get name(): string {
    return this.config.name;
  }

  async addFolder(name: string): Promise<FolderConfig> {
    const folderName = name.trim();
    const pathSegments = folderName.split('/');
    if (
      !folderName ||
      /\\/.test(folderName) ||
      pathSegments.some((segment) => !segment || segment === '.' || segment === '..')
    ) {
      throw new Error('Folder name is invalid.');
    }
    if (this.config.folders.some((folder) => folder.name === folderName)) {
      throw new Error('A folder with this name already exists.');
    }

    const folderId = Math.max(...this.config.folders.map((folder) => folder.id)) + 1;
    if (folderId > MAX_U16) throw new Error('The maximum number of folders has been reached.');

    const folder = createFolder(folderId, folderName, []);
    this.config.folders.push(folder);
    await this.save();

    return folder;
  }

  async renameFolder(id: number, name: string): Promise<FolderConfig> {
    const folderName = name.trim();
    if (
      !Number.isInteger(id) ||
      id < 0 ||
      !folderName ||
      folderName === '.' ||
      folderName === '..' ||
      /[\\/]/.test(folderName)
    ) {
      throw new Error('Folder name is invalid.');
    }

    const folder = this.config.folders.find((folder) => folder.id === id);
    if (!folder || !folder.name) throw new Error('Folder not found.');

    const parentPath = folder.name.includes('/') ? `${folder.name.slice(0, folder.name.lastIndexOf('/'))}/` : '';
    const renamedFolder = { ...folder, name: `${parentPath}${folderName}` };
    if (
      this.config.folders.some((currentFolder) => currentFolder.id !== id && currentFolder.name === renamedFolder.name)
    ) {
      throw new Error('A folder with this name already exists.');
    }

    this.config.folders[this.config.folders.indexOf(folder)] = renamedFolder;
    await this.save();

    return renamedFolder;
  }

  async renameProject(name: string): Promise<string> {
    const projectName = name.trim();
    if (!projectName) throw new Error('Project name cannot be empty.');

    this.config.name = projectName;
    await this.save();

    return projectName;
  }

  private async save(): Promise<void> {
    await writeFile(this.configPath, `${JSON.stringify(this.config, null, 2)}\n`, 'utf8');
  }
}
