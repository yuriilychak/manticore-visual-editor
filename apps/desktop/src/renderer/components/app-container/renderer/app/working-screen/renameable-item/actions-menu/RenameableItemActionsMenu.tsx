import { type FC, memo, useCallback } from 'react';

import { Divider, Menu } from '@mui/material';

import { AssetType } from '../../../../../../../../types';
import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';

import { RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_STYLES } from '../constants';
import type { ActionButtonConfig } from '../types';

import RenameableItemActionsMenuItem from './RenameableItemActionsMenuItem';

type RenameableItemActionsMenuProps = {
  contextMenuPosition: { left: number; top: number } | null;
  contentType: AssetType;
  disabledByAction: Record<string, boolean>;
  menuActions: ActionButtonConfig[];
  onAction: (action: string) => void;
  onClose: () => void;
};

const RenameableItemActionsMenu: FC<RenameableItemActionsMenuProps> = ({
  contextMenuPosition,
  contentType,
  disabledByAction,
  menuActions,
  onAction,
  onClose
}) => {
  const viewActions = contentType === AssetType.Project
    ? RENAMEABLE_ITEM_ACTIONS.viewProject
    : RENAMEABLE_ITEM_ACTIONS.viewContent;
  const handleMenuAction = useCallback((action: string) => {
    onClose();
    onAction(action);
  }, [onAction, onClose]);
  const handleClose = useCallback((event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
    onClose();
  }, [onClose]);

  return (
    <Menu
      anchorPosition={contextMenuPosition ?? undefined}
      anchorReference="anchorPosition"
      onClose={handleClose}
      open={Boolean(contextMenuPosition)}
      slotProps={{
        list: { sx: { p: 0.5 } },
        paper: { sx: { minWidth: 220 } }
      }}
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
  );
};

export default memo(RenameableItemActionsMenu);
