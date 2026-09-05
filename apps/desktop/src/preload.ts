import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('manticore', {
  platform: process.platform,
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (listener: (isMaximized: boolean) => void) => {
      const handleMaximizeChange = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => listener(isMaximized);

      ipcRenderer.on('window:maximize-change', handleMaximizeChange);

      return () => ipcRenderer.removeListener('window:maximize-change', handleMaximizeChange);
    },
    close: () => ipcRenderer.invoke('window:close')
  }
});
