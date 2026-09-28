import { type FC, type ReactNode } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';
import { Box, FilledInput, Tooltip, Typography } from '@mui/material';

import type { AssetType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { RenameableItemActionsMenu } from './actions-menu';
import { ITEM_GAP, RENAMEABLE_ITEM_LOCALE_KEYS, RENAMEABLE_ITEM_STYLES } from './constants';
import RenameableItemActionButtons from './RenameableItemActionButtons';
import type { ActionButtonConfig, RenameableItemLocalizedProps } from './types';
import { useRenameableItem } from './useRenameableItem';

type RenameableItemProps = {
  contentType: AssetType;
  id: number;
  Icon?: SvgIconComponent;
  icon?: ReactNode;
  name: string;
  onAction: ProjectActionHandler;
  disabledActions?: Record<string, boolean>;
  actions?: ActionButtonConfig[];
};

const RenameableItem: FC<RenameableItemProps & RenameableItemLocalizedProps> = ({
  contentType,
  id,
  Icon,
  icon,
  name,
  onAction,
  renameNameLabel,
  disabledActions,
  actions
}) => {
  const {
    boxComponent,
    disabledByAction,
    editedName,
    handleActionButtonClick,
    handleNameChange,
    handleSubmit,
    isEditing,
    itemActions,
    menuActions,
    trimmedName,
    viewActions
  } = useRenameableItem(contentType, id, name, onAction, disabledActions, actions);
  return (
    <Box
      alignItems="center"
      component={boxComponent}
      display="flex"
      gap={ITEM_GAP}
      minWidth={0}
      onSubmit={handleSubmit}
      width="100%"
    >
      {Icon ? <Icon color="action" fontSize="small" /> : icon}
      {isEditing ? (
        <>
          <FilledInput
            autoFocus
            disableUnderline
            error={!trimmedName}
            fullWidth
            inputProps={{ 'aria-label': renameNameLabel }}
            onChange={handleNameChange}
            size="small"
            sx={RENAMEABLE_ITEM_STYLES.editingNameInput}
            value={editedName}
          />
          <RenameableItemActionButtons
            actions={itemActions}
            disabledByAction={disabledByAction}
            onActionClick={handleActionButtonClick}
          />
        </>
      ) : (
        <>
          <Tooltip title={name}>
            <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} variant="subtitle1">
              {name}
            </Typography>
          </Tooltip>
          <RenameableItemActionsMenu
            disabledByAction={disabledByAction}
            menuActions={menuActions}
            onActionClick={handleActionButtonClick}
            viewActions={viewActions}
          />
        </>
      )}
    </Box>
  );
};

export default withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem);
