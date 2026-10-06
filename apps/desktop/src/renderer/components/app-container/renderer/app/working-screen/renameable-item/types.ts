import type { SvgIconComponent } from '@mui/icons-material';

export type RenameableItemLocalizedProps = {
  renameNameLabel: string;
};

export type ShortcutLabels = Record<'darwin' | 'linux' | 'win32', string>;

export type ActionButtonConfig = {
  action: string;
  tooltipLocale: string;
  Icon: SvgIconComponent;
  shortcut?: ShortcutLabels;
};
