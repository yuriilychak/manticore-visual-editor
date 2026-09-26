import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
} from '@manticore/project';
import type { ImportProjectAsset, ProjectInfo } from '@manticore/project';

const IS_DEVELOPMENT = !app.isPackaged;
const WINDOW_ICON_PATH = path.join(__dirname, '../build/icon.png');

type RestoredProject = { error?: string; project: ProjectInfo | null };

const LAST_PROJECT_FILE_NAME = 'last-project.json';

async function createWindow(language?: string, restoreProject = false): Promise<void> {
  const window = new BrowserWindow({
    icon: IS_DEVELOPMENT ? WINDOW_ICON_PATH : undefined,
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const location = new URL(navigationUrl);
    const isAllowed = IS_DEVELOPMENT ? location.origin === 'http://127.0.0.1:5173' : location.protocol === 'file:';

    if (!isAllowed) event.preventDefault();
  });
  window.on('maximize', () => window.webContents.send('window:maximize-change', true));
  window.on('unmaximize', () => window.webContents.send('window:maximize-change', false));

  if (IS_DEVELOPMENT) {
    const url = new URL('http://127.0.0.1:5173');
    if (language) url.searchParams.set('language', language);
    if (restoreProject) url.searchParams.set('restoreProject', 'true');

    await window.loadURL(url.toString());
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    await window.loadFile(path.join(__dirname, 'renderer/index.html'), {
      query: { ...(language ? { language } : {}), ...(restoreProject ? { restoreProject: 'true' } : {}) }
    });
  }
}

function getWindow(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}

const getLastProjectFilePath = () => path.join(app.getPath('userData'), LAST_PROJECT_FILE_NAME);

async function storeLastOpenedProject(projectPath: string): Promise<void> {
  await writeFile(getLastProjectFilePath(), `${JSON.stringify({ path: projectPath })}\n`, 'utf8');
}

async function restoreLastOpenedProject(): Promise<RestoredProject> {
  let projectPath: unknown;

  try {
    ({ path: projectPath } = JSON.parse(await readFile(getLastProjectFilePath(), 'utf8')) as { path?: unknown });
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === 'ENOENT') return { project: null };
    return { error: 'The previously opened project could not be restored.', project: null };
  }

  try {
    if (typeof projectPath !== 'string' || !projectPath) throw new Error('Project path is invalid.');
    return { project: await getProjectInfo(projectPath) };
  } catch {
    await unlink(getLastProjectFilePath()).catch(() => undefined);
    return { error: 'The previously opened project is no longer available.', project: null };
  }
}

ipcMain.handle('window:minimize', (event) => getWindow(event.sender)?.minimize());
ipcMain.handle('window:create', (_event, language: string) => createWindow(language));
ipcMain.handle('window:close', (event) => getWindow(event.sender)?.close());
ipcMain.handle('window:is-maximized', (event) => getWindow(event.sender)?.isMaximized() ?? false);
ipcMain.handle('window:toggle-maximize', (event) => {
  const window = getWindow(event.sender);
  if (!window) return false;

  if (window.isMaximized()) window.unmaximize();
  else window.maximize();

  return window.isMaximized();
});
ipcMain.handle('project:select-location', async (event) => {
  const options: OpenDialogOptions = {
    properties: ['createDirectory', 'openDirectory']
  };
  const parentWindow = getWindow(event.sender);
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  return result.canceled ? '' : (result.filePaths[0] ?? '');
});
ipcMain.handle('project:create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
  const projectName = name.trim();
  if (!isAssetName(projectName) || projectName === '.' || projectName === '..' || /[\\/]/.test(projectName))
    throw new Error('Project name is invalid.');

  const projectPath = path.resolve(parentPath, projectName);
  if (path.dirname(projectPath) !== path.resolve(parentPath)) throw new Error('Project path is invalid.');

  await createProject(projectPath, projectName);
  await storeLastOpenedProject(projectPath);
  return getProjectInfo(projectPath);
});
ipcMain.handle('project:open', async (event) => {
  const options: OpenDialogOptions = { properties: ['openDirectory'] };
  const parentWindow = getWindow(event.sender);
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);
  const projectPath = result.canceled ? '' : (result.filePaths[0] ?? '');
  if (!projectPath) return { content: [], folders: [], name: '', path: '', version: 0 };

  try {
    const project = await getProjectInfo(projectPath);
    await storeLastOpenedProject(projectPath);
    return project;
  } catch {
    throw new Error('The selected folder is not a valid Manticore project.');
  }
});
ipcMain.handle('project:restore-last-opened', () => restoreLastOpenedProject());
ipcMain.handle('project:select-import-files', async (event) => {
  const options: OpenDialogOptions = {
    filters: [{ extensions: ['avif', 'bmp', 'eot', 'gif', 'jpeg', 'jpg', 'otf', 'png', 'svg', 'ttf', 'webp', 'woff', 'woff2'], name: 'Images and fonts' }],
    properties: ['multiSelections', 'openFile']
  };
  const parentWindow = getWindow(event.sender);
  const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('project:load-import-images', async (_event, filePaths: string[]) =>
  Promise.all(filePaths.map(async (filePath) => {
    const extension = path.extname(filePath).toLocaleLowerCase();
    const type = { '.avif': 'image/avif', '.bmp': 'image/bmp', '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extension];
    if (!type) throw new Error('Image type is not supported.');

    const content = await readFile(filePath);
    return { content: content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength), name: path.basename(filePath), path: filePath, type };
  }))
);
ipcMain.handle('project:import-assets', (event, projectPath: string, bundleId: number, assets: ImportProjectAsset[], jobId: string) =>
  importProjectAssets(projectPath, bundleId, assets, (result) => event.sender.send('project:import-assets-progress', jobId, result))
);
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
  if (!isAssetName(name) || name === '.' || name === '..' || /[\\/]/.test(name))
    return { isAvailable: false, reason: 'invalid-name' };
  const projectPath = path.resolve(parentPath, name);
  if (path.dirname(projectPath) !== path.resolve(parentPath)) return { isAvailable: false, reason: 'invalid-name' };

  try {
    await stat(projectPath);
    return { isAvailable: false, reason: 'already-exists' };
  } catch {
    return { isAvailable: true };
  }
});

app.whenReady().then(() => createWindow(undefined, true));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow(undefined, true);
});
