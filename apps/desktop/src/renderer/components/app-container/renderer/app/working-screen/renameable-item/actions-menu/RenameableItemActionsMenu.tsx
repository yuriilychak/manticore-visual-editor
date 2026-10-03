import { memo, type FC, type MouseEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import { Divider, IconButton, Menu, Tooltip } from '@mui/material';

import { AssetType } from '../../../../../../../../types';
import { MENU_SLOT_PROPS, MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';
import { RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_STYLES } from '../constants';
import type { ActionButtonConfig } from '../types';
import RenameableItemActionsMenuItem from './RenameableItemActionsMenuItem';

type RenameableItemActionsMenuProps = {
  contentType: AssetType;
  disabledByAction: Record<string, boolean>;
  menuActions: ActionButtonConfig[];
  onAction: (action: string) => void;
};

const RenameableItemActionsMenu: FC<RenameableItemActionsMenuProps> = ({
  contentType,
  disabledByAction,
  menuActions,
  onAction
}) => {
  const viewActions = contentType === AssetType.Project
    ? RENAMEABLE_ITEM_ACTIONS.viewProject
    : RENAMEABLE_ITEM_ACTIONS.viewContent;
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  }, []);
  const handleClose = useCallback((event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    setMenuAnchor(null);
  }, []);
  const handleMenuAction = useCallback((action: string) => {
    handleClose();
    onAction(action);
  }, [handleClose, onAction]);

  return (
    <>
      <Tooltip title={t('common.actions')}>
        <IconButton aria-label={t('common.actions')} onClick={handleOpen} size="small" type="button">
          <MoreVertRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={menuAnchor}
        onClose={handleClose}
        open={Boolean(menuAnchor)}
        slotProps={MENU_SLOT_PROPS}
        sx={MENUBAR_STYLES.menu}
      >
        {viewActions.map((action) => (
          <RenameableItemActionsMenuItem
            action={action}
            disabled={disabledByAction[action.action]}
            key={action.action}
            onAction={handleMenuAction}
          />
        ))}
        {!!viewActions.length && !!menuActions.length && <Divider sx={RENAMEABLE_ITEM_STYLES.divider} />}
        {menuActions.map((action) => (
          <RenameableItemActionsMenuItem
            action={action}
            disabled={disabledByAction[action.action]}
            key={action.action}
            onAction={handleMenuAction}
          />
        ))}
      </Menu>
    </>
  );
};

export default memo(RenameableItemActionsMenu);
