import type { FC, ReactNode } from 'react';

import { Box, Typography } from '@mui/material';

import { AssetType } from '../../../../../../../types';

import { RenameableItemActionsMenu } from './actions-menu';
import { ITEM_GAP, RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_STYLES } from './constants';
import type { ActionButtonConfig } from './types';

type RenameableItemViewRendererProps = {
  children: ReactNode;
  contentType: AssetType;
  disableNameTooltip: boolean;
  disabledByAction: Record<string, boolean>;
  menuActions: ActionButtonConfig[];
  name: string;
  onAction: (action: string) => void;
};

const RenameableItemViewRenderer: FC<RenameableItemViewRendererProps> = ({
  children,
  contentType,
  disableNameTooltip,
  disabledByAction,
  menuActions,
  name,
  onAction
}) => {
  const viewActions = contentType === AssetType.Project
    ? RENAMEABLE_ITEM_ACTIONS.viewProject
    : RENAMEABLE_ITEM_ACTIONS.viewProject.concat(RENAMEABLE_ITEM_ACTIONS.delete);

  return (
    <Box alignItems="center" display="flex" gap={ITEM_GAP} minWidth={0} width="100%">
      {children}
      <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} title={disableNameTooltip ? undefined : name} variant="subtitle1">
        {name}
      </Typography>
      <RenameableItemActionsMenu
        disabledByAction={disabledByAction}
        menuActions={menuActions}
        onAction={onAction}
        viewActions={viewActions}
      />
    </Box>
  );
};

export default RenameableItemViewRenderer;
