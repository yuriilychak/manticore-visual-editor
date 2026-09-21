import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('manticore', {
  createWindow: (language: string) => ipcRenderer.invoke('window:create', language),
  openProject: () => ipcRenderer.invoke('project:open'),
  renameProject: (projectPath: string, name: string) => ipcRenderer.invoke('project:rename', projectPath, name),
  renameProjectBundle: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-bundle', projectPath, id, name),
  createProjectBundle: (projectPath: string, parentPath: string, name: string) => ipcRenderer.invoke('project:create-bundle', projectPath, parentPath, name),
  createProjectBundleFolder: (projectPath: string, parentId: number, name: string) => ipcRenderer.invoke('project:create-bundle-folder', projectPath, parentId, name),
  createProjectTextureAtlas: (projectPath: string, parentId: number, name: string) => ipcRenderer.invoke('project:create-texture-atlas', projectPath, parentId, name),
  moveProjectBundle: (projectPath: string, id: number, targetPath: string) => ipcRenderer.invoke('project:move-bundle', projectPath, id, targetPath),
  renameProjectFolder: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-folder', projectPath, id, name),
  moveProjectFolder: (projectPath: string, id: number, targetPath: string) => ipcRenderer.invoke('project:move-folder', projectPath, id, targetPath),
  createProjectFolder: (projectPath: string, name: string) => ipcRenderer.invoke('project:create-folder', projectPath, name),
  restoreLastOpenedProject: () => ipcRenderer.invoke('project:restore-last-opened'),
  createProject: (options: { name: string; parentPath: string }) => ipcRenderer.invoke('project:create', options),
  canCreateProject: (options: { name: string; parentPath: string }) =>
    ipcRenderer.invoke('project:can-create', options),
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
