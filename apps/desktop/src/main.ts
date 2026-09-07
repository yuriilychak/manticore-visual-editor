import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IS_DEVELOPMENT = !app.isPackaged;
const WINDOW_ICON_PATH = path.join(__dirname, '../build/icon.png');

type ProjectInfo = { name: string; path: string };

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

async function getProjectInfo(projectPath: string): Promise<ProjectInfo> {
  const config = JSON.parse(await readFile(path.join(projectPath, 'src', 'config.json'), 'utf8')) as { name?: unknown };
  if (typeof config.name !== 'string' || !config.name) throw new Error('Project configuration is invalid.');

  return { name: config.name, path: projectPath };
}

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
  const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);

  return result.canceled ? '' : result.filePaths[0] ?? '';
});
ipcMain.handle('project:create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) throw new Error('Project name is invalid.');

  const projectPath = path.resolve(parentPath, name);
  if (path.dirname(projectPath) !== path.resolve(parentPath)) throw new Error('Project path is invalid.');

  await mkdir(projectPath);
  const sourcePath = path.join(projectPath, 'src');
  await mkdir(sourcePath);
  await writeFile(path.join(sourcePath, 'config.json'), `${JSON.stringify({ name }, null, 2)}\n`, 'utf8');
  const bundlePath = path.join(projectPath, 'src', '000000');
  await mkdir(bundlePath, { recursive: true });
  await writeFile(
    path.join(bundlePath, 'config.json'),
    `${JSON.stringify({ id: '0', name: 'default_bundle', version: 0 }, null, 2)}\n`,
    'utf8'
  );
  await storeLastOpenedProject(projectPath);
  return projectPath;
});
ipcMain.handle('project:open', async (event) => {
  const options: OpenDialogOptions = { properties: ['openDirectory'] };
  const parentWindow = getWindow(event.sender);
  const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);
  const projectPath = result.canceled ? '' : result.filePaths[0] ?? '';
  if (!projectPath) return { name: '', path: '' };

  try {
    const project = await getProjectInfo(projectPath);
    await storeLastOpenedProject(projectPath);
    return project;
  } catch {
    throw new Error('The selected folder is not a valid Manticore project.');
  }
});
ipcMain.handle('project:restore-last-opened', () => restoreLastOpenedProject());
ipcMain.handle('project:can-create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) return { isAvailable: false, reason: 'invalid-name' };
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
