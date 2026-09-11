import type { SvgIconComponent } from '@mui/icons-material';

export type RenameableItemLocalizedProps = {
  renameNameLabel: string;
};

export type ActionButtonConfig = {
  action: string;
  tooltipLocale: string;
  Icon: SvgIconComponent;
};
