import type { IpcRenderer } from 'electron';

import type { ProjectContent } from './types';

export const createProjectBridge = (ipcRenderer: IpcRenderer) => ({
  canCreateProject: (options: { name: string; parentPath: string }) => ipcRenderer.invoke('project:can-create', options),
  createProject: (options: { name: string; parentPath: string }) => ipcRenderer.invoke('project:create', options),
  createProjectBundle: (projectPath: string, parentPath: string, name: string) => ipcRenderer.invoke('project:create-bundle', projectPath, parentPath, name),
  createProjectBundleFolder: (projectPath: string, parentId: number, name: string) => ipcRenderer.invoke('project:create-bundle-folder', projectPath, parentId, name),
  createProjectFolder: (projectPath: string, name: string) => ipcRenderer.invoke('project:create-folder', projectPath, name),
  createProjectTextureAtlas: (projectPath: string, parentId: number, name: string) => ipcRenderer.invoke('project:create-texture-atlas', projectPath, parentId, name),
  importAssets: (projectPath: string, bundleId: number, assets: Array<{ data?: Uint8Array; filePath: string }>, jobId: string) => ipcRenderer.invoke('project:import-assets', projectPath, bundleId, assets, jobId),
  loadImportImages: (filePaths: string[]) => ipcRenderer.invoke('project:load-import-images', filePaths),
  moveProjectBundle: (projectPath: string, id: number, targetPath: string) => ipcRenderer.invoke('project:move-bundle', projectPath, id, targetPath),
  moveProjectFolder: (projectPath: string, id: number, targetPath: string) => ipcRenderer.invoke('project:move-folder', projectPath, id, targetPath),
  onImportAssetsProgress: (listener: (jobId: string, result: { asset: ProjectContent | null; error: string | null; filePath: string }) => void) => {
    const handleProgress = (_event: Electron.IpcRendererEvent, jobId: string, result: { asset: ProjectContent | null; error: string | null; filePath: string }) => listener(jobId, result);
    ipcRenderer.on('project:import-assets-progress', handleProgress);
    return () => ipcRenderer.removeListener('project:import-assets-progress', handleProgress);
  },
  openProject: () => ipcRenderer.invoke('project:open'),
  renameProject: (projectPath: string, name: string) => ipcRenderer.invoke('project:rename', projectPath, name),
  renameProjectBundle: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-bundle', projectPath, id, name),
  renameProjectBundleFolder: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-bundle-folder', projectPath, id, name),
  renameProjectFolder: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-folder', projectPath, id, name),
  renameProjectTextureAtlas: (projectPath: string, id: number, name: string) => ipcRenderer.invoke('project:rename-texture-atlas', projectPath, id, name),
  restoreLastOpenedProject: () => ipcRenderer.invoke('project:restore-last-opened'),
  selectImportFiles: () => ipcRenderer.invoke('project:select-import-files'),
  selectProjectLocation: () => ipcRenderer.invoke('project:select-location')
});
