import type { ProjectContent } from '../project/types';

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
      createProjectFolder: (projectPath: string, name: string) => Promise<FolderConfig>;
      createProjectBundle: (projectPath: string, parentPath: string, name: string) => Promise<ProjectContent>;
      createProjectBundleFolder?: (projectPath: string, parentId: number, name: string) => Promise<ProjectContent>;
      openProject: () => Promise<ProjectInfo>;
      moveProjectFolder?: (projectPath: string, id: number, targetPath: string) => Promise<FolderConfig[]>;
      moveProjectBundle?: (projectPath: string, id: number, targetPath: string) => Promise<ProjectContent>;
      renameProject?: (projectPath: string, name: string) => Promise<string>;
      renameProjectBundle?: (projectPath: string, id: number, name: string) => Promise<ProjectContent>;
      renameProjectFolder?: (projectPath: string, id: number, name: string) => Promise<FolderConfig>;
      restoreLastOpenedProject: () => Promise<RestoredProject>;
      createProjectTextureAtlas?: (projectPath: string, parentId: number, name: string) => Promise<ProjectContent>;
      createProject: (options: NewProjectOptions) => Promise<ProjectInfo>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string>;
      windowControls: WindowControls;
    };
  }
}
