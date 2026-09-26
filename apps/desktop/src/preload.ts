import { contextBridge, ipcRenderer } from 'electron';

import { createProjectBridge } from '@manticore/project/electron-preload';

contextBridge.exposeInMainWorld('manticore', {
  createWindow: (language: string) => ipcRenderer.invoke('window:create', language),
  ...createProjectBridge(ipcRenderer),
  platform: process.platform,
  selectProjectLocation: () => ipcRenderer.invoke('project:select-location'),
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
