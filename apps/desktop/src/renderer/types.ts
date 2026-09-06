export type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close' | 'none';

export type ApplicationAction =
  | 'create-file'
  | 'create-project'
  | 'create-window'
  | 'getting-started'
  | 'import-file'
  | 'import-project'
  | 'open-community'
  | 'open-documentation'
  | 'open-help-center'
  | 'open-keyboard-shortcuts'
  | 'open-project'
  | 'report-issue'
  | 'set-language-en'
  | 'set-language-es';

export type WindowControls = {
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  minimize: () => Promise<void>;
  onMaximizeChange: (listener: (isMaximized: boolean) => void) => () => void;
  toggleMaximize: () => Promise<boolean>;
};

export type NewProjectOptions = {
  name: string;
  parentPath: string;
};

export type ProjectCreationValidation = { isAvailable: boolean; reason?: 'already-exists' | 'invalid-name' };
