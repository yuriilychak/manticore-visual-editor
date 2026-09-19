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
      openProject: () => Promise<ProjectInfo>;
      renameProject?: (projectPath: string, name: string) => Promise<string>;
      renameProjectFolder?: (projectPath: string, id: number, name: string) => Promise<FolderConfig>;
      restoreLastOpenedProject: () => Promise<RestoredProject>;
      createProject: (options: NewProjectOptions) => Promise<ProjectInfo>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string>;
      windowControls: WindowControls;
    };
  }
}
