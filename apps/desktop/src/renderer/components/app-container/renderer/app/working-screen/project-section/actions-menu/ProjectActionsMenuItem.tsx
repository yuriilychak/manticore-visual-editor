import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, ListItemText, MenuItem, Typography } from '@mui/material';

import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';
import { ITEM_HEIGHT, ITEM_ICON_SIZE } from '../../renameable-item/constants';
import type { ActionButtonConfig } from '../../renameable-item/types';

type ProjectActionsMenuItemProps = {
  action: ActionButtonConfig;
  disabled: boolean;
  onAction: (action: string) => void;
};

const ProjectActionsMenuItem: FC<ProjectActionsMenuItemProps> = ({ action, disabled, onAction }) => {
  const { t } = useTranslation();
  const { action: actionId, tooltipLocale, Icon, shortcut } = action;
  const shortcutLabel = shortcut?.[window.manticore?.platform as keyof typeof shortcut];
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
        minHeight: ITEM_HEIGHT,
        px: 0,
        py: 0,
        '& .MuiListItemText-primary': { fontSize: '0.875rem', lineHeight: '20px' }
      }}
    >
      <Box component="span" display="flex" flexShrink={0} mr={0.25} width={ITEM_ICON_SIZE}>
        <Icon sx={{ fontSize: ITEM_ICON_SIZE }} />
      </Box>
      <ListItemText sx={{ m: 0, mr: shortcutLabel ? 1 : 0 }}>{t(tooltipLocale)}</ListItemText>
      {shortcutLabel && (
        <Typography
          aria-hidden
          color="text.secondary"
          sx={{ fontSize: '0.875rem', lineHeight: '20px', whiteSpace: 'nowrap' }}
        >
          {shortcutLabel}
        </Typography>
      )}
    </MenuItem>
  );
};

export default ProjectActionsMenuItem;
