import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AssetType } from '../types';

import { MAX_U16 } from './constants';
import { createProjectContent, isAssetName, isProjectContent } from './content';
import type { ProjectConfig, ProjectContent } from './types';

export class ProjectConfigProxy {
  static async load(projectPath: string): Promise<ProjectConfigProxy> {
    const configPath = path.join(projectPath, 'src', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8')) as { content?: unknown; name?: unknown; version?: unknown };
    if (
      !isAssetName(config.name) ||
      typeof config.version !== 'number' || !Number.isInteger(config.version) || config.version < 0 || config.version > MAX_U16 ||
      !Array.isArray(config.content) || !config.content.every(isProjectContent)
    ) {
      throw new Error('Project configuration is invalid.');
    }
    const content = config.content as ProjectContent[];
    if (
      new Set(content.map((item) => item.id)).size !== content.length ||
      content.some((item) => item.parentId !== 0 && !content.some((parent) => parent.id === item.parentId))
    ) throw new Error('Project configuration is invalid.');

    return new ProjectConfigProxy(configPath, config as ProjectConfig);
  }

  private constructor(
    private readonly configPath: string,
    private readonly config: ProjectConfig
  ) {}

  get content(): ProjectContent[] {
    return this.config.content;
  }

  get name(): string {
    return this.config.name;
  }

  get version(): number {
    return this.config.version;
  }

  async addFolder(name: string, parentId: number): Promise<ProjectContent> {
    if (!isAssetName(name) || !this.config.content.some((item) => item.id === parentId && item.type === AssetType.ProjectFolder)) {
      throw new Error('Folder is invalid.');
    }
    if (this.config.content.some((item) => item.parentId === parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }
    const id = Math.max(0, ...this.config.content.map((item) => item.id)) + 1;
    if (id > MAX_U16) throw new Error('The maximum number of assets has been reached.');

    const folder = createProjectContent(id, name, parentId, AssetType.ProjectFolder);
    this.config.content.push(folder);
    await this.save();
    return folder;
  }

  async addBundle(name: string, parentId: number): Promise<ProjectContent> {
    if (!isAssetName(name) || !this.config.content.some((item) => item.id === parentId && item.type === AssetType.ProjectFolder)) {
      throw new Error('Bundle is invalid.');
    }
    if (this.config.content.some((item) => item.parentId === parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }
    const id = Math.max(0, ...this.config.content.map((item) => item.id)) + 1;
    if (id > MAX_U16) throw new Error('The maximum number of assets has been reached.');

    const bundle = createProjectContent(id, name, parentId, AssetType.Bundle);
    this.config.content.push(bundle);
    await this.save();
    return bundle;
  }

  async addBundleFolder(name: string, parentId: number): Promise<ProjectContent> {
    return this.addBundleContent(name, parentId, AssetType.BundleFolder);
  }

  async addTextureAtlas(name: string, parentId: number): Promise<ProjectContent> {
    return this.addBundleContent(name, parentId, AssetType.TextureAtlas);
  }

  async renameFolder(id: number, name: string): Promise<ProjectContent> {
    if (!isAssetName(name)) throw new Error('Folder name must be 1 to 32 printable ASCII characters.');
    const folder = this.config.content.find((item) => item.id === id && item.type === AssetType.ProjectFolder);
    if (!folder || folder.parentId === 0) throw new Error('Folder not found.');
    if (this.config.content.some((item) => item.id !== id && item.parentId === folder.parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }
    const renamed = { ...folder, name };
    this.config.content[this.config.content.indexOf(folder)] = renamed;
    await this.save();
    return renamed;
  }

  async renameBundle(id: number, name: string): Promise<ProjectContent> {
    if (!isAssetName(name)) throw new Error('Bundle name must be 1 to 32 printable ASCII characters.');
    const bundle = this.config.content.find((item) => item.id === id && item.type === AssetType.Bundle);
    if (!bundle) throw new Error('Bundle not found.');
    if (this.config.content.some((item) => item.id !== id && item.parentId === bundle.parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }

    const renamed = { ...bundle, name };
    this.config.content[this.config.content.indexOf(bundle)] = renamed;
    await this.save();
    return renamed;
  }

  async renameBundleFolder(id: number, name: string): Promise<ProjectContent> {
    return this.renameBundleContent(id, name, AssetType.BundleFolder, 'Bundle folder');
  }

  async renameTextureAtlas(id: number, name: string): Promise<ProjectContent> {
    return this.renameBundleContent(id, name, AssetType.TextureAtlas, 'Texture atlas');
  }

  async moveFolder(id: number, parentId: number): Promise<ProjectContent> {
    const folder = this.config.content.find((item) => item.id === id && item.type === AssetType.ProjectFolder);
    if (!folder || folder.parentId === 0 || !this.config.content.some((item) => item.id === parentId && item.type === AssetType.ProjectFolder)) {
      throw new Error('Folder not found.');
    }
    for (let ancestorId = parentId; ancestorId !== 0;) {
      if (ancestorId === id) throw new Error('A folder cannot be moved into itself.');
      ancestorId = this.config.content.find((item) => item.id === ancestorId)?.parentId ?? 0;
    }
    if (this.config.content.some((item) => item.id !== id && item.parentId === parentId && item.name === folder.name)) {
      throw new Error('A sibling with this name already exists.');
    }
    const moved = { ...folder, parentId };
    this.config.content[this.config.content.indexOf(folder)] = moved;
    await this.save();
    return moved;
  }

  async moveBundle(id: number, parentId: number): Promise<ProjectContent> {
    const bundle = this.config.content.find((item) => item.id === id && item.type === AssetType.Bundle);
    if (!bundle || !this.config.content.some((item) => item.id === parentId && item.type === AssetType.ProjectFolder)) {
      throw new Error('Bundle or target folder not found.');
    }
    if (this.config.content.some((item) => item.id !== id && item.parentId === parentId && item.name === bundle.name)) {
      throw new Error('A sibling with this name already exists.');
    }

    const moved = { ...bundle, parentId };
    this.config.content[this.config.content.indexOf(bundle)] = moved;
    await this.save();
    return moved;
  }

  async renameProject(name: string): Promise<string> {
    const projectName = name.trim();
    if (!isAssetName(projectName)) throw new Error('Project name must be 1 to 32 printable ASCII characters.');

    this.config.name = projectName;
    await this.save();

    return projectName;
  }

  private async addBundleContent(name: string, parentId: number, type: AssetType.BundleFolder | AssetType.TextureAtlas): Promise<ProjectContent> {
    if (!isAssetName(name) || !this.config.content.some((item) => item.id === parentId && (item.type === AssetType.Bundle || item.type === AssetType.BundleFolder))) {
      throw new Error('Bundle content is invalid.');
    }
    if (this.config.content.some((item) => item.parentId === parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }
    const id = Math.max(0, ...this.config.content.map((item) => item.id)) + 1;
    if (id > MAX_U16) throw new Error('The maximum number of assets has been reached.');

    const content = createProjectContent(id, name, parentId, type);
    this.config.content.push(content);
    await this.save();
    return content;
  }

  private async renameBundleContent(
    id: number,
    name: string,
    type: AssetType.BundleFolder | AssetType.TextureAtlas,
    label: string
  ): Promise<ProjectContent> {
    if (!isAssetName(name)) throw new Error(`${label} name must be 1 to 32 printable ASCII characters.`);
    const content = this.config.content.find((item) => item.id === id && item.type === type);
    if (!content) throw new Error(`${label} not found.`);
    if (this.config.content.some((item) => item.id !== id && item.parentId === content.parentId && item.name === name)) {
      throw new Error('A sibling with this name already exists.');
    }

    const renamed = { ...content, name };
    this.config.content[this.config.content.indexOf(content)] = renamed;
    await this.save();
    return renamed;
  }

  private async save(): Promise<void> {
    await writeFile(this.configPath, `${JSON.stringify(this.config, null, 2)}\n`, 'utf8');
  }
}
