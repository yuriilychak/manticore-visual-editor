import type { SvgIconComponent } from '@mui/icons-material';

import type { ShortcutLabels } from '../../../../../../keyboard-shortcuts';

export type RenameableItemLocalizedProps = {
  renameNameLabel: string;
};

export type RenameableItemEditingActionHandler = (action: string, data?: string) => Promise<void>;

export type ActionButtonConfig = {
  action: string;
  tooltipLocale: string;
  Icon: SvgIconComponent;
  shortcut?: ShortcutLabels;
};
