import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, ListItemText, MenuItem, Typography } from '@mui/material';

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
  const { action: actionId, tooltipLocale, Icon, shortcut } = action;
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
      <Box component="span" display="flex" flexShrink={0} mr={0.25} width={ITEM_ICON_SIZE}>
        <Icon sx={{ fontSize: ITEM_ICON_SIZE }} />
      </Box>
      <ListItemText sx={{ m: 0, mr: shortcut ? 1 : 0 }}>{t(tooltipLocale)}</ListItemText>
      {shortcut && (
        <Typography
          aria-hidden
          color="text.secondary"
          sx={{ fontSize: '0.875rem', lineHeight: '20px', whiteSpace: 'nowrap' }}
        >
          {shortcut}
        </Typography>
      )}
    </MenuItem>
  );
};

export default RenameableItemActionsMenuItem;
