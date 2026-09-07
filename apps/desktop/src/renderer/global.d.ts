import type { NewProjectOptions, ProjectCreationValidation, ProjectInfo, RestoredProject, WindowControls } from './types';

export {};

declare global {
  interface Window {
    manticore?: {
      createWindow: (language: string) => Promise<void>;
      openProject: () => Promise<ProjectInfo>;
      restoreLastOpenedProject: () => Promise<RestoredProject>;
      createProject: (options: NewProjectOptions) => Promise<string>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string>;
      windowControls: WindowControls;
    };
  }
}
