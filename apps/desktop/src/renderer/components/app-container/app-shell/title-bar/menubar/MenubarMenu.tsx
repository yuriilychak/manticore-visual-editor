import type { FC, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Divider, Menu, MenuItem } from '@mui/material';

import { MENU_SLOT_PROPS, MENUBAR_STYLES } from './constants';
import type {
  AnchorElement,
  MenubarHandlers,
  MenubarItemStateGetter,
  MenubarMenu as MenubarMenuConfig
} from './types';

type MenubarMenuProps = {
  anchorEl: AnchorElement;
  getDisabled: MenubarItemStateGetter;
  getSelected: MenubarItemStateGetter;
  handlers: MenubarHandlers;
  menu: MenubarMenuConfig;
  onClose: () => void;
};

const MenubarMenu: FC<MenubarMenuProps> = ({
  anchorEl,
  getDisabled,
  getSelected,
  handlers,
  menu: { anchorOrigin, items, style, transformOrigin },
  onClose
}) => {
  const { t } = useTranslation();
  const menuChildren = items.reduce<ReactElement[]>(
    (children, group, groupIndex) => {
      if (groupIndex > 0) {
        children.push(<Divider key={`divider-${groupIndex}`} sx={MENUBAR_STYLES.divider} />);
      }

      group.forEach(({ id, labelKey, type }) => {
        children.push(
          <MenuItem
            data-id={id}
            disabled={getDisabled(type, id)}
            key={id}
            onClick={handlers[type]}
            selected={getSelected(type, id)}
            sx={MENUBAR_STYLES.menuItem}
          >
            {t(labelKey)}
            {type === 'submenu' && <ChevronRightRounded fontSize="small" sx={{ ml: 'auto' }} />}
          </MenuItem>
        );
      });

      return children;
    },
    []
  );

  return (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={anchorOrigin}
      onClose={onClose}
      open={Boolean(anchorEl)}
      slotProps={MENU_SLOT_PROPS}
      sx={MENUBAR_STYLES[style]}
      transformOrigin={transformOrigin}
    >
      {menuChildren}
    </Menu>
  );
};

export default MenubarMenu;
