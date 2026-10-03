import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';

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
    <MenuItem disabled={disabled} onClick={handleActionClick} sx={MENUBAR_STYLES.menuItem}>
      <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
      <ListItemText>{t(tooltipLocale)}</ListItemText>
    </MenuItem>
  );
};

export default RenameableItemActionsMenuItem;
