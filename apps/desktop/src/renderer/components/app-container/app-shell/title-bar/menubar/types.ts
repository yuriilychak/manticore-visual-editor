import type { ApplicationAction } from '../../../../../types';

export type MenuId = 'file' | 'help' | 'language';

type MenuAnchorOrigin = {
  horizontal: 'left' | 'right';
  vertical: 'bottom' | 'top';
};

export type MenubarMenuItem = {
  id: ApplicationAction | MenuId;
  labelKey: string;
  type: 'action' | 'submenu';
};

export type MenubarMenu = {
  anchorOrigin?: MenuAnchorOrigin;
  id: MenuId;
  isMenubarButton: boolean;
  items: readonly MenubarMenuItem[];
  labelKey: string;
  style: 'languageMenu' | 'menu';
  transformOrigin?: MenuAnchorOrigin;
};
