import { type FC, memo } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Typography } from '@mui/material';

import type { AssetType, ProjectActionHandler } from '../../../../../../types';
import { withLocalizedProps } from '../../../../../localization';

import { ITEM_GAP, ITEM_HEIGHT, ITEM_ICON_SIZE, RENAMEABLE_ITEM_LOCALE_KEYS, RENAMEABLE_ITEM_STYLES } from './constants';
import RenameableItemEditingRenderer from './RenameableItemEditingRenderer';
import type { RenameableItemLocalizedProps } from './types';
import { useRenameableItem } from './useRenameableItem';

type RenameableItemProps = {
  contentType: AssetType;
  expandable: boolean;
  expandIconDisabled: boolean;
  expanded: boolean;
  id: number;
  isEditing: boolean;
  Icon: SvgIconComponent;
  name: string;
  onAction: ProjectActionHandler;
  onEditingChange: (id: number) => void;
};

const RenameableItem: FC<RenameableItemProps & RenameableItemLocalizedProps> = ({
  contentType,
  expandable,
  expandIconDisabled,
  expanded,
  id,
  isEditing,
  Icon,
  name,
  onAction,
  onEditingChange,
  renameNameLabel
}) => {
  const {
    handleButtonClick,
    isSaving
  } = useRenameableItem(contentType, id, onAction, onEditingChange);
  const ExpandIcon = expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <Box
      alignItems="center"
      display="flex"
      gap={ITEM_GAP}
      height={ITEM_HEIGHT}
      minWidth={0}
      pl={expandable ? 0 : 3}
      width="100%"
    >
      {expandable && <ExpandIcon color={expandIconDisabled ? 'disabled' : 'action'} sx={{ fontSize: ITEM_ICON_SIZE }} />}
      <Icon color="action" sx={{ fontSize: ITEM_ICON_SIZE }} />
      {isEditing ? (
        <RenameableItemEditingRenderer
          isSaving={isSaving}
          name={name}
          onAction={handleButtonClick}
          renameNameLabel={renameNameLabel}
        />
      ) : (
        <Typography component="h2" noWrap sx={RENAMEABLE_ITEM_STYLES.name} title={name} variant="subtitle1">
          {name}
        </Typography>
      )}
    </Box>
  );
};

export default memo(withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem));
