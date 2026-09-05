import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const IS_DEVELOPMENT = !app.isPackaged;

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
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
    await window.loadURL('http://127.0.0.1:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    await window.loadFile(path.join(__dirname, 'renderer/index.html'));
  }
}

function getWindow(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}

ipcMain.handle('window:minimize', (event) => getWindow(event.sender)?.minimize());
ipcMain.handle('window:close', (event) => getWindow(event.sender)?.close());
ipcMain.handle('window:is-maximized', (event) => getWindow(event.sender)?.isMaximized() ?? false);
ipcMain.handle('window:toggle-maximize', (event) => {
  const window = getWindow(event.sender);
  if (!window) return false;

  if (window.isMaximized()) window.unmaximize();
  else window.maximize();

  return window.isMaximized();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
