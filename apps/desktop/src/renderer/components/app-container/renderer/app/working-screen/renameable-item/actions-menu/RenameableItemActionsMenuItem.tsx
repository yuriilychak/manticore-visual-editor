import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';

import type { ActionButtonConfig } from '../types';

type RenameableItemActionsMenuItemProps = {
  action: ActionButtonConfig;
  disabled: boolean;
  onClick: MouseEventHandler<HTMLElement>;
};

const RenameableItemActionsMenuItem: FC<RenameableItemActionsMenuItemProps> = ({ action, disabled, onClick }) => {
  const { t } = useTranslation();
  const { action: actionId, tooltipLocale, Icon, icon } = action;

  return (
    <MenuItem data-action={actionId} disabled={disabled} onClick={onClick} sx={MENUBAR_STYLES.menuItem}>
      {Icon ? <ListItemIcon><Icon fontSize="small" /></ListItemIcon> : icon}
      <ListItemText>{t(tooltipLocale)}</ListItemText>
    </MenuItem>
  );
};

export default RenameableItemActionsMenuItem;
