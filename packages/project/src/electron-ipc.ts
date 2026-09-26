import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { BrowserWindow, IpcMain, OpenDialogOptions, WebContents } from 'electron';

import {
  createProject,
  createProjectBundle,
  createProjectBundleFolder,
  createProjectFolder,
  createProjectTextureAtlas,
  getProjectInfo,
  importProjectAssets,
  isAssetName,
  moveProjectBundle,
  moveProjectFolder,
  renameProject,
  renameProjectBundle,
  renameProjectBundleFolder,
  renameProjectFolder,
  renameProjectTextureAtlas
} from './index';
import type { ImportProjectAsset, ProjectInfo } from './index';

type RegisterProjectIpcOptions = {
  dialog: { showOpenDialog: (window: BrowserWindow | undefined, options: OpenDialogOptions) => ReturnType<typeof import('electron').dialog.showOpenDialog> };
  getWindow: (sender: WebContents) => BrowserWindow | null;
  ipcMain: IpcMain;
  onProjectOpened: (projectPath: string) => Promise<void>;
  restoreLastOpenedProject: () => Promise<{ error?: string; project: ProjectInfo | null }>;
};

const getDialogResult = async (dialog: RegisterProjectIpcOptions['dialog'], window: BrowserWindow | null, options: OpenDialogOptions) =>
  dialog.showOpenDialog(window ?? undefined, options);

export const registerProjectIpcHandlers = ({ dialog, getWindow, ipcMain, onProjectOpened, restoreLastOpenedProject }: RegisterProjectIpcOptions): void => {
  ipcMain.handle('project:select-location', async (event) => {
    const result = await getDialogResult(dialog, getWindow(event.sender), { properties: ['createDirectory', 'openDirectory'] });
    return result.canceled ? '' : (result.filePaths[0] ?? '');
  });
  ipcMain.handle('project:create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
    const projectName = name.trim();
    if (!isAssetName(projectName) || projectName === '.' || projectName === '..' || /[\\/]/.test(projectName)) throw new Error('Project name is invalid.');
    const projectPath = path.resolve(parentPath, projectName);
    if (path.dirname(projectPath) !== path.resolve(parentPath)) throw new Error('Project path is invalid.');
    await createProject(projectPath, projectName);
    await onProjectOpened(projectPath);
    return getProjectInfo(projectPath);
  });
  ipcMain.handle('project:open', async (event) => {
    const result = await getDialogResult(dialog, getWindow(event.sender), { properties: ['openDirectory'] });
    const projectPath = result.canceled ? '' : (result.filePaths[0] ?? '');
    if (!projectPath) return { content: [], folders: [], name: '', path: '', version: 0 };
    try {
      const project = await getProjectInfo(projectPath);
      await onProjectOpened(projectPath);
      return project;
    } catch { throw new Error('The selected folder is not a valid Manticore project.'); }
  });
  ipcMain.handle('project:restore-last-opened', restoreLastOpenedProject);
  ipcMain.handle('project:select-import-files', async (event) => {
    const result = await getDialogResult(dialog, getWindow(event.sender), { filters: [{ extensions: ['avif', 'bmp', 'eot', 'gif', 'jpeg', 'jpg', 'otf', 'png', 'svg', 'ttf', 'webp', 'woff', 'woff2'], name: 'Images and fonts' }], properties: ['multiSelections', 'openFile'] });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('project:load-import-images', async (_event, filePaths: string[]) => Promise.all(filePaths.map(async (filePath) => {
    const type = ({ '.avif': 'image/avif', '.bmp': 'image/bmp', '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' } as Record<string, string | undefined>)[path.extname(filePath).toLocaleLowerCase()];
    if (!type) throw new Error('Image type is not supported.');
    const content = await readFile(filePath);
    return { content: content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength), name: path.basename(filePath), path: filePath, type };
  })));
  ipcMain.handle('project:import-assets', (event, projectPath: string, bundleId: number, assets: ImportProjectAsset[], jobId: string) => importProjectAssets(projectPath, bundleId, assets, (result) => event.sender.send('project:import-assets-progress', jobId, result)));
  ipcMain.handle('project:rename', (_event, projectPath: string, name: string) => renameProject(projectPath, name));
  ipcMain.handle('project:rename-bundle', (_event, projectPath: string, id: number, name: string) => renameProjectBundle(projectPath, id, name));
  ipcMain.handle('project:create-bundle', (_event, projectPath: string, parentPath: string, name: string) => createProjectBundle(projectPath, parentPath, name));
  ipcMain.handle('project:create-bundle-folder', (_event, projectPath: string, parentId: number, name: string) => createProjectBundleFolder(projectPath, parentId, name));
  ipcMain.handle('project:create-texture-atlas', (_event, projectPath: string, parentId: number, name: string) => createProjectTextureAtlas(projectPath, parentId, name));
  ipcMain.handle('project:rename-bundle-folder', (_event, projectPath: string, id: number, name: string) => renameProjectBundleFolder(projectPath, id, name));
  ipcMain.handle('project:rename-texture-atlas', (_event, projectPath: string, id: number, name: string) => renameProjectTextureAtlas(projectPath, id, name));
  ipcMain.handle('project:move-bundle', (_event, projectPath: string, id: number, targetPath: string) => moveProjectBundle(projectPath, id, targetPath));
  ipcMain.handle('project:create-folder', (_event, projectPath: string, name: string) => createProjectFolder(projectPath, name));
  ipcMain.handle('project:rename-folder', (_event, projectPath: string, id: number, name: string) => renameProjectFolder(projectPath, id, name));
  ipcMain.handle('project:move-folder', (_event, projectPath: string, id: number, targetPath: string) => moveProjectFolder(projectPath, id, targetPath));
  ipcMain.handle('project:can-create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
    if (!isAssetName(name) || name === '.' || name === '..' || /[\\/]/.test(name)) return { isAvailable: false, reason: 'invalid-name' };
    if (path.dirname(path.resolve(parentPath, name)) !== path.resolve(parentPath)) return { isAvailable: false, reason: 'invalid-name' };
    try { await stat(path.resolve(parentPath, name)); return { isAvailable: false, reason: 'already-exists' }; } catch { return { isAvailable: true }; }
  });
};
