import type { NewProjectOptions, ProjectCreationValidation, ProjectInfo, WindowControls } from './types';

export {};

declare global {
  interface Window {
    manticore?: {
      createWindow: (language: string) => Promise<void>;
      openProject: () => Promise<ProjectInfo>;
      createProject: (options: NewProjectOptions) => Promise<string>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string>;
      windowControls: WindowControls;
    };
  }
}
