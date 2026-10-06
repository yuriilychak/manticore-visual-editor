import type { FC } from 'react';

import { Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';

import { RenameableItemActionsMenu } from './actions-menu';
import { RENAMEABLE_ITEM_STYLES } from './constants';
import type { ActionButtonConfig } from './types';

type RenameableItemViewRendererProps = {
  contextMenuPosition: { left: number; top: number } | null;
  contentType: AssetType;
  disabledByAction: Record<string, boolean>;
  menuActions: ActionButtonConfig[];
  name: string;
  onAction: (action: string) => void;
  onCloseContextMenu: () => void;
};

const RenameableItemViewRenderer: FC<RenameableItemViewRendererProps> = ({
  contextMenuPosition,
  contentType,
  disabledByAction,
  menuActions,
  name,
  onAction,
  onCloseContextMenu
}) => (
  <>
    <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} title={name} variant="subtitle1">
      {name}
    </Typography>
    <RenameableItemActionsMenu
      contentType={contentType}
      contextMenuPosition={contextMenuPosition}
      disabledByAction={disabledByAction}
      menuActions={menuActions}
      onAction={onAction}
      onClose={onCloseContextMenu}
    />
  </>
);

export default RenameableItemViewRenderer;
