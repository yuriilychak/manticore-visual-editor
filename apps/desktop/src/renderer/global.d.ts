import type { ProjectContent } from '@manticore/project/types';

import type {
  FolderConfig,
  NewProjectOptions,
  ProjectCreationValidation,
  ProjectInfo,
  RestoredProject,
  WindowControls
} from './types';

export {};

declare global {
  interface Window {
    manticore?: {
      createWindow: (language: string) => Promise<void>;
      createProjectFolder: (projectPath: string, parentId: number, name: string) => Promise<FolderConfig>;
      createProjectBundle: (projectPath: string, parentId: number, name: string) => Promise<ProjectContent>;
      createProjectBundleFolder?: (projectPath: string, parentId: number, name: string) => Promise<ProjectContent>;
      openProject: () => Promise<ProjectInfo>;
      loadImportImages?: (filePaths: string[]) => Promise<Array<{ content: ArrayBuffer; name: string; path: string; type: string }>>;
      selectImportFiles?: () => Promise<string[]>;
      importAssets?: (projectPath: string, bundleId: number, assets: Array<{ data?: Uint8Array; filePath: string; preview?: Uint8Array }>, jobId: string) => Promise<Array<{ asset: ProjectContent | null; error: string | null; filePath: string }>>;
      onImportAssetsProgress?: (listener: (jobId: string, result: { asset: ProjectContent | null; error: string | null; filePath: string }) => void) => () => void;
      moveProjectFolder?: (projectPath: string, id: number, parentId: number) => Promise<FolderConfig[]>;
      moveProjectBundle?: (projectPath: string, id: number, parentId: number) => Promise<ProjectContent>;
      moveProjectContent?: (projectPath: string, id: number, parentId: number) => Promise<ProjectContent>;
      renameProject?: (projectPath: string, name: string) => Promise<string>;
      renameProjectBundle?: (projectPath: string, id: number, name: string) => Promise<ProjectContent>;
      renameProjectBundleFolder?: (projectPath: string, id: number, name: string) => Promise<ProjectContent>;
      renameProjectFolder?: (projectPath: string, id: number, name: string) => Promise<FolderConfig>;
      renameProjectTextureAtlas?: (projectPath: string, id: number, name: string) => Promise<ProjectContent>;
      restoreLastOpenedProject: () => Promise<RestoredProject>;
      createProjectTextureAtlas?: (projectPath: string, parentId: number, name: string) => Promise<ProjectContent>;
      deleteProjectContent?: (projectPath: string, id: number) => Promise<ProjectInfo>;
      createProject: (options: NewProjectOptions) => Promise<ProjectInfo>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string>;
      windowControls: WindowControls;
    };
  }
}
