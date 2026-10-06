import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';

import { ITEM_ICON_SIZE } from '../constants';
import type { ActionButtonConfig } from '../types';

type RenameableItemActionsMenuItemProps = {
  action: ActionButtonConfig;
  disabled: boolean;
  onAction: (action: string) => void;
};

const RenameableItemActionsMenuItem: FC<RenameableItemActionsMenuItemProps> = ({ action, disabled, onAction }) => {
  const { t } = useTranslation();
  const { action: actionId, tooltipLocale, Icon } = action;
  const handleActionClick: MouseEventHandler<HTMLLIElement> = event => {
    event.stopPropagation();
    onAction(actionId);
  };
  return (
    <MenuItem
      disabled={disabled}
      onClick={handleActionClick}
      sx={{
        ...MENUBAR_STYLES.menuItem,
        minHeight: 24,
        px: 0,
        py: 0,
        '& .MuiListItemText-primary': { fontSize: '0.875rem', lineHeight: '20px' }
      }}
    >
      <ListItemIcon><Icon sx={{ fontSize: ITEM_ICON_SIZE }} /></ListItemIcon>
      <ListItemText>{t(tooltipLocale)}</ListItemText>
    </MenuItem>
  );
};

export default RenameableItemActionsMenuItem;
