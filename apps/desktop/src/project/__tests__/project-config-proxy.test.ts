import { afterEach, describe, expect, test } from '@jest/globals';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createProject } from '../project';
import { ProjectConfigProxy } from '../project-config-proxy';

describe('ProjectConfigProxy', () => {
  let projectPath = '';

  afterEach(async () => {
    if (projectPath) await rm(projectPath, { force: true, recursive: true });
  });

  test('creates a single manifest with the root folder and default bundle', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    const destination = path.join(projectPath, 'Example');

    await createProject(destination, 'Example');

    await expect(access(path.join(destination, 'src', 'images'))).resolves.toBeUndefined();
    await expect(access(path.join(destination, 'src', 'fonts'))).resolves.toBeUndefined();
    await expect(readFile(path.join(destination, 'src', '00002', 'config.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, 'src', 'config.json'), 'utf8')).resolves.toBe(
      `${JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 }
        ],
        name: 'Example',
        version: 0
      }, null, 2)}\n`
    );
  });

  test('stores folders by IDs and updates only the moved folder parent', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'Assets', parentId: 1, type: 1, version: 0 },
          { data: null, id: 3, name: 'Images', parentId: 2, type: 1, version: 0 },
          { data: null, id: 4, name: 'Resources', parentId: 1, type: 1, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );
    const projectConfig = await ProjectConfigProxy.load(projectPath);

    const movedFolder = await projectConfig.moveFolder(2, 4);

    expect(movedFolder).toEqual({ data: null, id: 2, name: 'Assets', parentId: 4, type: 1, version: 0 });
    const savedConfig = JSON.parse(await readFile(path.join(projectPath, 'src', 'config.json'), 'utf8')) as {
      content: { id: number; parentId: number }[];
    };

    expect(savedConfig.content).toEqual([
      { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
      { data: null, id: 2, name: 'Assets', parentId: 4, type: 1, version: 0 },
      { data: null, id: 3, name: 'Images', parentId: 2, type: 1, version: 0 },
      { data: null, id: 4, name: 'Resources', parentId: 1, type: 1, version: 0 }
    ]);
  });

  test('renames bundles and rejects sibling name conflicts', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 },
          { data: null, id: 3, name: 'Assets', parentId: 1, type: 1, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );
    const projectConfig = await ProjectConfigProxy.load(projectPath);

    await expect(projectConfig.renameBundle(2, 'Assets')).rejects.toThrow('A sibling with this name already exists.');
    await expect(projectConfig.renameBundle(2, 'Main bundle')).resolves.toEqual({
      data: null, id: 2, name: 'Main bundle', parentId: 1, type: 2, version: 0
    });

    const savedConfig = JSON.parse(await readFile(path.join(projectPath, 'src', 'config.json'), 'utf8')) as {
      content: { id: number; name: string }[];
    };
    expect(savedConfig.content.find((item) => item.id === 2)?.name).toBe('Main bundle');
  });

  test('moves a bundle to another project folder', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 },
          { data: null, id: 3, name: 'Assets', parentId: 1, type: 1, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );

    await expect((await ProjectConfigProxy.load(projectPath)).moveBundle(2, 3)).resolves.toEqual({
      data: null, id: 2, name: 'default_bundle', parentId: 3, type: 2, version: 0
    });
  });

  test('adds a bundle to a project folder with a new ID', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'Assets', parentId: 1, type: 1, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );

    await expect((await ProjectConfigProxy.load(projectPath)).addBundle('Sprites', 2)).resolves.toEqual({
      data: null, id: 3, name: 'Sprites', parentId: 2, type: 2, version: 0
    });
    await expect((await ProjectConfigProxy.load(projectPath)).addBundle('Sprites', 2)).rejects.toThrow(
      'A sibling with this name already exists.'
    );
  });

  test('adds bundle folders and texture atlases beneath a bundle', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );
    const projectConfig = await ProjectConfigProxy.load(projectPath);

    await expect(projectConfig.addBundleFolder('Sprites', 2)).resolves.toEqual({
      data: null, id: 3, name: 'Sprites', parentId: 2, type: 3, version: 0
    });
    await expect(projectConfig.addTextureAtlas('Characters', 3)).resolves.toEqual({
      data: null, id: 4, name: 'Characters', parentId: 3, type: 5, version: 0
    });
  });

  test('renames bundle folders and texture atlases while enforcing sibling names', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 },
          { data: null, id: 3, name: 'Sprites', parentId: 2, type: 3, version: 0 },
          { data: null, id: 4, name: 'Characters', parentId: 3, type: 5, version: 0 },
          { data: null, id: 5, name: 'UI', parentId: 3, type: 5, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );
    const projectConfig = await ProjectConfigProxy.load(projectPath);

    await expect(projectConfig.renameBundleFolder(3, 'Images')).resolves.toMatchObject({ id: 3, name: 'Images' });
    await expect(projectConfig.renameTextureAtlas(4, 'UI')).rejects.toThrow('A sibling with this name already exists.');
    await expect(projectConfig.renameTextureAtlas(4, 'Characters HD')).resolves.toMatchObject({ id: 4, name: 'Characters HD' });
  });
});
