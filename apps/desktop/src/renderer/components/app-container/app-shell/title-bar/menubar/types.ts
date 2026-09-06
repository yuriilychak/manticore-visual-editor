import type { MouseEventHandler } from 'react';

import type { ApplicationAction } from '../../../../../types';

export type MenuId = 'file' | 'help' | 'language';

export type AnchorElement = HTMLElement | null;

export type MenubarMenuAnchors = Record<MenuId, AnchorElement>;

export type MenubarMenuItemType = 'action' | 'submenu';

export type MenubarHandlers = Record<MenubarMenuItemType, MouseEventHandler<HTMLElement>>;

type MenuAnchorOrigin = {
  horizontal: 'left' | 'right';
  vertical: 'bottom' | 'top';
};

export type MenubarMenuItem = {
  id: ApplicationAction | MenuId;
  labelKey: string;
  type: MenubarMenuItemType;
};

export type MenubarItemId = MenubarMenuItem['id'];

export type MenubarItemStateGetter = (type: MenubarMenuItemType, id: MenubarItemId) => boolean;

export type MenubarMenu = {
  anchorOrigin?: MenuAnchorOrigin;
  id: MenuId;
  isMenubarButton: boolean;
  items: readonly (readonly MenubarMenuItem[])[];
  labelKey: string;
  style: 'languageMenu' | 'menu';
  transformOrigin?: MenuAnchorOrigin;
};
