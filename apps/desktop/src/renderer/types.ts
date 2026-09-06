export type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close' | 'none';

export type ApplicationAction =
  | 'create-file'
  | 'create-project'
  | 'getting-started'
  | 'import-file'
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
