import { afterEach, describe, expect, test } from '@jest/globals';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createProject, deleteProjectContent, importProjectAssets } from '../project';
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

    await expect(access(path.join(destination, 'src', 'assets'))).resolves.toBeUndefined();
    await expect(readFile(path.join(destination, 'src', '00002', 'config.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, 'src', 'config.json'), 'utf8')).resolves.toBe(
      `${JSON.stringify({
        content: [
          { id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 }
        ],
        name: 'Example',
        version: 0
      }, null, 2)}\n`
    );
  });

  test('imports image and font assets with unique names and serialized image data', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    const destination = path.join(projectPath, 'Example');
    const imagePath = path.join(projectPath, 'hero.png');
    const fontPath = path.join(projectPath, 'hero.ttf');
    await writeFile(imagePath, new Uint8Array([1, 2, 3]));
    await writeFile(fontPath, new Uint8Array([4, 5, 6]));
    await createProject(destination, 'Example');

    await expect(importProjectAssets(destination, 2, [
      { data: [7, 8, 9], filePath: imagePath, preview: [10, 11, 12] },
      { filePath: fontPath }
    ])).resolves.toEqual([
      { asset: { id: 3, name: 'hero', parentId: 2, type: 4, version: 0 }, error: null, filePath: imagePath },
      { asset: { id: 4, name: 'hero (1)', parentId: 2, type: 6, version: 0 }, error: null, filePath: fontPath }
    ]);
    await expect(readFile(path.join(destination, 'src', 'assets', '00003', 'source'))).resolves.toEqual(Buffer.from([1, 2, 3]));
    await expect(readFile(path.join(destination, 'src', 'assets', '00003', 'asset'))).resolves.toEqual(Buffer.from([7, 8, 9]));
    await expect(readFile(path.join(destination, 'src', 'assets', '00003', 'preview'))).resolves.toEqual(Buffer.from([10, 11, 12]));
    await expect(readFile(path.join(destination, 'src', 'assets', '00004', 'source'))).resolves.toEqual(Buffer.from([4, 5, 6]));
    const config = JSON.parse(await readFile(path.join(destination, 'src', 'config.json'), 'utf8')) as { content: Array<{ data: unknown; id: number }> };
    expect(config.content.find(({ id }) => id === 3)).not.toHaveProperty('data');
  });

  test('plans unique names and IDs before creating asset files', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    const destination = path.join(projectPath, 'Example');
    const imagePath = path.join(projectPath, 'hero.png');
    const duplicateImagePath = path.join(projectPath, 'hero.jpg');
    await writeFile(imagePath, new Uint8Array([1]));
    await writeFile(duplicateImagePath, new Uint8Array([2]));
    await createProject(destination, 'Example');

    await expect(importProjectAssets(destination, 2, [
      { data: [3], filePath: imagePath },
      { data: [4], filePath: duplicateImagePath }
    ])).resolves.toEqual([
      { asset: { id: 3, name: 'hero', parentId: 2, type: 4, version: 0 }, error: null, filePath: imagePath },
      { asset: { id: 4, name: 'hero (1)', parentId: 2, type: 4, version: 0 }, error: null, filePath: duplicateImagePath }
    ]);
    await expect(readFile(path.join(destination, 'src', 'assets', '00003', 'source'))).resolves.toEqual(Buffer.from([1]));
    await expect(readFile(path.join(destination, 'src', 'assets', '00004', 'source'))).resolves.toEqual(Buffer.from([2]));
  });

  test('deletes a content subtree and its asset directories', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    const destination = path.join(projectPath, 'Example');
    await createProject(destination, 'Example');
    await writeFile(
      path.join(destination, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { id: 2, name: 'default_bundle', parentId: 1, type: 2, version: 0 },
          { id: 3, name: 'Sprites', parentId: 2, type: 3, version: 0 },
          { id: 4, name: 'hero', parentId: 3, type: 4, version: 0 },
          { id: 5, name: 'font', parentId: 2, type: 6, version: 0 }
        ],
        name: 'Example',
        version: 0
      })
    );
    await mkdir(path.join(destination, 'src', 'assets', '00004'), { recursive: true });
    await mkdir(path.join(destination, 'src', 'assets', '00005'), { recursive: true });
    await writeFile(path.join(destination, 'src', 'assets', '00004', 'source'), 'image');
    await writeFile(path.join(destination, 'src', 'assets', '00005', 'source'), 'font');

    await expect(deleteProjectContent(destination, [2, 5])).resolves.toMatchObject({ content: [{ id: 1 }] });
    await expect(access(path.join(destination, 'src', 'assets', '00004'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(path.join(destination, 'src', 'assets', '00005'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, 'src', 'config.json'), 'utf8')).resolves.toContain('"id": 1');
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

  test('moves bundle content to compatible bundle, bundle-folder, and atlas targets', async () => {
    projectPath = await mkdtemp(path.join(tmpdir(), 'manticore-project-'));
    await mkdir(path.join(projectPath, 'src'));
    await writeFile(
      path.join(projectPath, 'src', 'config.json'),
      JSON.stringify({
        content: [
          { data: null, id: 1, name: '', parentId: 0, type: 1, version: 0 },
          { data: null, id: 2, name: 'Main', parentId: 1, type: 2, version: 0 },
          { data: null, id: 3, name: 'Nested', parentId: 1, type: 2, version: 0 },
          { data: null, id: 4, name: 'Source', parentId: 2, type: 3, version: 0 },
          { data: null, id: 5, name: 'Target', parentId: 2, type: 3, version: 0 },
          { data: null, id: 6, name: 'Characters', parentId: 2, type: 5, version: 0 },
          { data: null, id: 7, name: 'Hero', parentId: 2, type: 4, version: 0 }
        ],
        name: 'Project',
        version: 0
      })
    );
    const projectConfig = await ProjectConfigProxy.load(projectPath);

    await expect(projectConfig.moveContent(4, 5)).resolves.toMatchObject({ id: 4, parentId: 5 });
    await expect(projectConfig.moveContent(3, 4)).resolves.toMatchObject({ id: 3, parentId: 4 });
    await expect(projectConfig.moveContent(6, 5)).resolves.toMatchObject({ id: 6, parentId: 5 });
    await expect(projectConfig.moveContent(7, 6)).resolves.toMatchObject({ id: 7, parentId: 6 });
    await expect(projectConfig.moveContent(5, 4)).rejects.toThrow('Content cannot be moved into itself.');
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
