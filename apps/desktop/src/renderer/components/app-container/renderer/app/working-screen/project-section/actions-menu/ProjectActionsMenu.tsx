import { type FC, memo, useCallback } from 'react';

import { Divider, Menu } from '@mui/material';

import { AssetType } from '../../../../../../../../types';
import { MENUBAR_STYLES } from '../../../../../app-shell/title-bar/menubar/constants';
import { RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_STYLES } from '../../renameable-item/constants';
import type { ActionButtonConfig } from '../../renameable-item/types';

import ProjectActionsMenuItem from './ProjectActionsMenuItem';

type ProjectActionsMenuProps = {
  contextMenuPosition: { left: number; top: number };
  contentType: AssetType;
  disabledByAction: Record<string, boolean>;
  menuActions: ActionButtonConfig[];
  open: boolean;
  onAction: (action: string) => void;
  onClose: () => void;
};

const ProjectActionsMenu: FC<ProjectActionsMenuProps> = ({
  contextMenuPosition,
  contentType,
  disabledByAction,
  menuActions,
  open,
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
      anchorPosition={contextMenuPosition}
      anchorReference="anchorPosition"
      onClose={handleClose}
      open={open}
      slotProps={{
        list: { sx: { p: 0.5 } },
        paper: { sx: { minWidth: 220 } }
      }}
      sx={MENUBAR_STYLES.menu}
    >
      {viewActions.map((action) => (
        <ProjectActionsMenuItem
          action={action}
          disabled={disabledByAction[action.action]}
          key={action.action}
          onAction={handleMenuAction}
        />
      ))}
      {!!viewActions.length && !!menuActions.length && <Divider sx={RENAMEABLE_ITEM_STYLES.divider} />}
      {menuActions.map((action) => (
        <ProjectActionsMenuItem
          action={action}
          disabled={disabledByAction[action.action]}
          key={action.action}
          onAction={handleMenuAction}
        />
      ))}
    </Menu>
  );
};

export default memo(ProjectActionsMenu);
