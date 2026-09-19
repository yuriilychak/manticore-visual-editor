import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { SvgIconComponent } from '@mui/icons-material';
import { Box, FilledInput, IconButton, Tooltip, Typography } from '@mui/material';

import type { ContentType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { ITEM_GAP, RENAMEABLE_ITEM_LOCALE_KEYS, RENAMEABLE_ITEM_STYLES } from './constants';
import type { ActionButtonConfig, RenameableItemLocalizedProps } from './types';
import { useRenameableItem } from './useRenameableItem';

type RenameableItemProps = {
  contentType: ContentType;
  id: number;
  Icon: SvgIconComponent;
  name: string;
  onAction: ProjectActionHandler;
  disabledActions?: Record<string, boolean>;
  actions?: ActionButtonConfig[];
};

const RenameableItem: FC<RenameableItemProps & RenameableItemLocalizedProps> = ({
  contentType,
  id,
  Icon,
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
      <Icon color="action" fontSize="small" />
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
      {itemActions.map(({ action, tooltipLocale, Icon: ActionIcon }) => (
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
              <ActionIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
};

export default withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem);
