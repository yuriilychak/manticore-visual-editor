import type { FC } from 'react';

import { Box, FilledInput } from '@mui/material';

import { ITEM_GAP, RENAMEABLE_ITEM_STYLES } from './constants';
import RenameableItemActionButtons from './RenameableItemActionButtons';
import { useRenameableItemEditingRenderer } from './useRenameableItemEditingRenderer';

type RenameableItemEditingRendererProps = {
  isSaving: boolean;
  name: string;
  onAction: (action: string, data?: string) => Promise<void>;
  renameNameLabel: string;
};

const RenameableItemEditingRenderer: FC<RenameableItemEditingRendererProps> = ({
  isSaving,
  name,
  onAction,
  renameNameLabel
}) => {
  const { editedName, handleAction, handleNameChange, handleSubmit, trimmedName } =
    useRenameableItemEditingRenderer(name, onAction);

  return (
    <Box
      alignItems="center"
      component="form"
      display="flex"
      flexGrow={1}
      gap={ITEM_GAP}
      minWidth={0}
      onSubmit={handleSubmit}
    >
      <FilledInput
        autoFocus
        disableUnderline
        endAdornment={
          <RenameableItemActionButtons
            isSaveDisabled={!trimmedName}
            isSaving={isSaving}
            onAction={handleAction}
          />
        }
        error={!trimmedName}
        fullWidth
        inputProps={{ 'aria-label': renameNameLabel }}
        onChange={handleNameChange}
        size="small"
        sx={RENAMEABLE_ITEM_STYLES.editingNameInput}
        value={editedName}
      />
    </Box>
  );
};

export default RenameableItemEditingRenderer;
