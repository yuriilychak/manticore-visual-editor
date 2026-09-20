import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { SvgIconComponent } from '@mui/icons-material';
import { Box, FilledInput, IconButton, Tooltip, Typography } from '@mui/material';

import type { AssetType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { ITEM_GAP, RENAMEABLE_ITEM_LOCALE_KEYS, RENAMEABLE_ITEM_STYLES } from './constants';
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
  const { t } = useTranslation();
  const {
    boxComponent,
    disabledByAction,
    editedName,
    handleActionButtonClick,
    handleNameChange,
    handleSubmit,
    isEditing,
    itemActions,
    trimmedName
  } = useRenameableItem(contentType, id, name, onAction, disabledActions, actions);

  return (
    <Box
      alignItems="center"
      component={boxComponent}
      display="flex"
      gap={ITEM_GAP}
      onSubmit={handleSubmit}
      sx={RENAMEABLE_ITEM_STYLES.viewActions}
    >
      {Icon ? <Icon color="action" fontSize="small" /> : icon}
      {isEditing ? (
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
      ) : (
        <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} variant="subtitle1">
          {name}
        </Typography>
      )}
      {itemActions.map(({ action, tooltipLocale, Icon: ActionIcon, icon: actionIcon }) => (
        <Tooltip key={action} title={t(tooltipLocale)}>
          <span>
            <IconButton
              aria-label={t(tooltipLocale)}
              className="renameable-item-view-action"
              data-action={action}
              disabled={disabledByAction[action]}
              onClick={handleActionButtonClick}
              size="small"
              type="button"
            >
              {ActionIcon ? <ActionIcon fontSize="small" /> : actionIcon}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
};

export default withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem);
