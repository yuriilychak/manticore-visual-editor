import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Button } from '@mui/material';

import type { ApplicationAction } from '../../../../../types';

import { MENUBAR_STYLES, MENUS } from './constants';
import MenubarMenu from './MenubarMenu';
import type { MenubarItemId } from './types';
import { useMenubar } from './useMenubar';

type MenubarProps = {
  disabledItemIds: readonly MenubarItemId[];
  onAction: (action: ApplicationAction) => void;
  selectedActionIds: readonly ApplicationAction[];
};

const Menubar: FC<MenubarProps> = ({ disabledItemIds, onAction, selectedActionIds }) => {
  const { t } = useTranslation();
  const { anchors, buttons, closeMenus, getDisabled, getSelected, handlers } = useMenubar(
    onAction,
    selectedActionIds,
    disabledItemIds
  );

  return (
    <Box display="flex" onDoubleClick={(event) => event.stopPropagation()}>
      {buttons.map(({ id, labelKey }) => (
        <Button
          data-id={id}
          disabled={getDisabled('submenu', id)}
          key={id}
          onClick={handlers.submenu}
          sx={MENUBAR_STYLES.button}
          variant="text"
        >
          {t(labelKey)}
        </Button>
      ))}
      {MENUS.map((menu) => (
        <MenubarMenu
          anchorEl={anchors[menu.id]}
          getDisabled={getDisabled}
          getSelected={getSelected}
          handlers={handlers}
          key={menu.id}
          menu={menu}
          onClose={closeMenus}
        />
      ))}
    </Box>
  );
};

export default memo(Menubar);
