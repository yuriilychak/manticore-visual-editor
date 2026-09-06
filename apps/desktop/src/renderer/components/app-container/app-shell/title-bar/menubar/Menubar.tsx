import { type FC, type MouseEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Box, Button, Menu, MenuItem } from '@mui/material';

import type { ApplicationAction } from '../../../../../types';

import { FILE_MENU_ITEMS, LANGUAGE_MENU_ITEMS, MENUBAR_STYLES } from './constants';

type MenubarProps = {
  onAction: (action: ApplicationAction) => void;
};

const Menubar: FC<MenubarProps> = ({ onAction }) => {
  const { i18n, t } = useTranslation();
  const [fileMenuAnchor, setFileMenuAnchor] = useState<HTMLElement | null>(null);
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<HTMLElement | null>(null);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState<HTMLElement | null>(null);

  const closeMenus = () => {
    setFileMenuAnchor(null);
    setHelpMenuAnchor(null);
    setLanguageMenuAnchor(null);
  };

  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
    closeMenus();
  };
  const handleFileAction = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onAction(event.currentTarget.dataset.action as ApplicationAction);
      closeMenus();
    },
    [onAction]
  );

  return (
    <Box display="flex" onDoubleClick={(event) => event.stopPropagation()}>
      <Button onClick={(event) => setFileMenuAnchor(event.currentTarget)} sx={MENUBAR_STYLES.button} variant="text">
        {t('menu.file.label')}
      </Button>
      <Button onClick={(event) => setHelpMenuAnchor(event.currentTarget)} sx={MENUBAR_STYLES.button} variant="text">
        {t('menu.help.label')}
      </Button>

      <Menu
        anchorEl={fileMenuAnchor}
        onClose={closeMenus}
        open={Boolean(fileMenuAnchor)}
        slotProps={{ list: { disablePadding: true } }}
        sx={MENUBAR_STYLES.menu}
      >
        {FILE_MENU_ITEMS.map(({ action, labelKey }) => (
          <MenuItem data-action={action} key={action} onClick={handleFileAction} sx={MENUBAR_STYLES.menuItem}>
            {t(labelKey)}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={helpMenuAnchor}
        onClose={closeMenus}
        open={Boolean(helpMenuAnchor)}
        slotProps={{ list: { disablePadding: true } }}
        sx={MENUBAR_STYLES.menu}
      >
        <MenuItem onClick={(event) => setLanguageMenuAnchor(event.currentTarget)} sx={MENUBAR_STYLES.menuItem}>
          {t('menu.help.language')}
          <ChevronRightRounded fontSize="small" sx={{ ml: 'auto' }} />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={languageMenuAnchor}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        onClose={closeMenus}
        open={Boolean(languageMenuAnchor)}
        slotProps={{ list: { disablePadding: true } }}
        sx={MENUBAR_STYLES.languageMenu}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      >
        {LANGUAGE_MENU_ITEMS.map(({ code, labelKey }) => (
          <MenuItem
            key={code}
            onClick={() => changeLanguage(code)}
            selected={i18n.language === code}
            sx={MENUBAR_STYLES.menuItem}
          >
            {t(labelKey)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default Menubar;
