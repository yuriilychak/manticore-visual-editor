import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Box, Button, Menu, MenuItem } from '@mui/material';

import type { ApplicationAction } from '../../../../../types';

import { MENU_SLOT_PROPS, MENUBAR_STYLES, MENUS } from './constants';
import { useMenubar } from './useMenubar';

type MenubarProps = {
  onAction: (action: ApplicationAction) => void;
  selectedActionIds: readonly ApplicationAction[];
};

const Menubar: FC<MenubarProps> = ({ onAction, selectedActionIds }) => {
  const { t } = useTranslation();
  const { anchors, buttons, closeMenus, getSelected, handlers } = useMenubar(onAction, selectedActionIds);

  return (
    <Box display="flex" onDoubleClick={(event) => event.stopPropagation()}>
      {buttons.map(({ id, labelKey }) => (
        <Button data-id={id} key={id} onClick={handlers.submenu} sx={MENUBAR_STYLES.button} variant="text">
          {t(labelKey)}
        </Button>
      ))}
      {MENUS.map(({ anchorOrigin, id, items, style, transformOrigin }) => (
        <Menu
          anchorEl={anchors[id]}
          anchorOrigin={anchorOrigin}
          key={id}
          onClose={closeMenus}
          open={Boolean(anchors[id])}
          slotProps={MENU_SLOT_PROPS}
          sx={MENUBAR_STYLES[style]}
          transformOrigin={transformOrigin}
        >
          {items.map(({ id, labelKey, type }) => (
            <MenuItem
              data-id={id}
              key={id}
              onClick={handlers[type]}
              selected={getSelected(type, id)}
              sx={MENUBAR_STYLES.menuItem}
            >
              {t(labelKey)}
              {type === 'submenu' && <ChevronRightRounded fontSize="small" sx={{ ml: 'auto' }} />}
            </MenuItem>
          ))}
        </Menu>
      ))}
    </Box>
  );
};

export default memo(Menubar);
