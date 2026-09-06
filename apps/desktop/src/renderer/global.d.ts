import type { NewProjectOptions, ProjectCreationValidation, WindowControls } from './types';

export {};

declare global {
  interface Window {
    manticore?: {
      createWindow: (language: string) => Promise<void>;
      createProject: (options: NewProjectOptions) => Promise<void>;
      canCreateProject: (options: NewProjectOptions) => Promise<ProjectCreationValidation>;
      platform: string;
      selectProjectLocation: () => Promise<string | undefined>;
      windowControls: WindowControls;
    };
  }
}
