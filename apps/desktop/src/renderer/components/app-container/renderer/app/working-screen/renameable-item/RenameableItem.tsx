import { type ChangeEvent, type FC, type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SvgIconComponent } from '@mui/icons-material';
import { Box, FilledInput, InputAdornment, Typography } from '@mui/material';

import {
  EDITING_BOX_PROPS,
  ITEM_GAP,
  RENAMEABLE_ITEM_ACTIONS,
  RENAMEABLE_ITEM_STYLES,
  VIEW_BOX_PROPS
} from './constants';
import RenameableItemActions from './RenameableItemActions';
import type { ActionButtonConfig } from './types';

type RenameableItemProps = {
  Icon: SvgIconComponent;
  name: string;
  onAction: (action: string) => void;
  onRename: (newName: string) => void | Promise<void>;
  disabledActions?: Record<string, boolean>;
  actions?: ActionButtonConfig[];
};

const RenameableItem: FC<RenameableItemProps> = ({
  Icon,
  name,
  onAction,
  onRename,
  disabledActions = {},
  actions = RENAMEABLE_ITEM_ACTIONS.empty
}) => {
  const { t } = useTranslation();
  const [isEditing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isSaving, setSaving] = useState(false);
  const allActions = useMemo(
    () => actions.concat(RENAMEABLE_ITEM_ACTIONS.viewProject),
    [actions]
  );
  const trimmedName = editedName.trim();
  const disabledByAction: Record<string, boolean> = {
    ...disabledActions,
    cancel: isSaving,
    save: !trimmedName || isSaving
  };

  const saveName = async () => {
    if (!trimmedName) return;

    setSaving(true);
    try {
      await onRename(trimmedName);
      setEditing(false);
    } catch {
      // The caller is responsible for presenting a failed-save notification.
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void saveName();
  };
  
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => setEditedName(event.target.value);

  const handleButtonClick = (action: string) => {
    switch (action) {
      case 'cancel':
        setEditedName(name);
        setEditing(false);
        break;
      case 'rename':
        setEditing(true);
        break;
      case 'save':
        void saveName();
        break;
      default:
        onAction(action);
    }
  };

  const boxProps = isEditing ? EDITING_BOX_PROPS : VIEW_BOX_PROPS;

  return (
    <Box
      {...boxProps}
      alignItems="center"
      display="flex"
      gap={ITEM_GAP}
      onSubmit={isEditing ? handleSubmit : undefined}
    >
      <Icon color="action" fontSize="small" />
      {isEditing ? (
        <FilledInput
          autoFocus
          disableUnderline
          endAdornment={
            <InputAdornment position="end">
              <RenameableItemActions
                actions={RENAMEABLE_ITEM_ACTIONS.editing}
                disabledByAction={disabledByAction}
                onClick={handleButtonClick}
              />
            </InputAdornment>
          }
          error={!trimmedName}
          fullWidth
          inputProps={{ 'aria-label': t('common.renameName') }}
          onChange={handleNameChange}
          size="small"
          sx={RENAMEABLE_ITEM_STYLES.editingNameInput}
          value={editedName}
        />
      ) : (
        <>
          <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} variant="subtitle1">{name}</Typography>
          <RenameableItemActions
            actions={allActions}
            className="renameable-item-view-action"
            disabledByAction={disabledByAction}
            onClick={handleButtonClick}
          />
        </>
      )}
    </Box>
  );
};

export default RenameableItem;
