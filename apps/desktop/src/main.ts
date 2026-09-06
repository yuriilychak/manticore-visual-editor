import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IS_DEVELOPMENT = !app.isPackaged;
const WINDOW_ICON_PATH = path.join(__dirname, '../build/icon.png');

async function createWindow(language?: string): Promise<void> {
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

    await window.loadURL(url.toString());
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    await window.loadFile(path.join(__dirname, 'renderer/index.html'), { query: language ? { language } : undefined });
  }
}

function getWindow(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
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

  return result.canceled ? undefined : result.filePaths[0];
});
ipcMain.handle('project:create', async (_event, { name, parentPath }: { name: string; parentPath: string }) => {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) throw new Error('Project name is invalid.');

  const projectPath = path.resolve(parentPath, name);
  if (path.dirname(projectPath) !== path.resolve(parentPath)) throw new Error('Project path is invalid.');

  await mkdir(projectPath);
  const bundlePath = path.join(projectPath, 'src', '000000');
  await mkdir(bundlePath, { recursive: true });
  await writeFile(
    path.join(bundlePath, 'config.json'),
    `${JSON.stringify({ id: '0', name: 'default_bundle', version: 0 }, null, 2)}\n`,
    'utf8'
  );
});
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

app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
