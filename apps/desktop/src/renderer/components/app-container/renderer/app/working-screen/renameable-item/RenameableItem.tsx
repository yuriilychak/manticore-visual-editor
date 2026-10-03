import { memo, type FC } from 'react';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SvgIconComponent } from '@mui/icons-material';
import { Box } from '@mui/material';
import type { AssetType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { ITEM_GAP, RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_LOCALE_KEYS } from './constants';
import RenameableItemEditingRenderer from './RenameableItemEditingRenderer';
import RenameableItemViewRenderer from './RenameableItemViewRenderer';
import type { ActionButtonConfig, RenameableItemLocalizedProps } from './types';
import { useRenameableItem } from './useRenameableItem';

type RenameableItemProps = {
  contentType: AssetType;
  expandable: boolean;
  expandIconDisabled: boolean;
  expanded: boolean;
  id: number;
  Icon: SvgIconComponent;
  name: string;
  onAction: ProjectActionHandler;
  disabledActions: Record<string, boolean>;
  actions?: ActionButtonConfig[];
};

const RenameableItem: FC<RenameableItemProps & RenameableItemLocalizedProps> = ({
  contentType,
  expandable,
  expandIconDisabled,
  expanded,
  id,
  Icon,
  name,
  onAction,
  renameNameLabel,
  disabledActions,
  actions = RENAMEABLE_ITEM_ACTIONS.empty
}) => {
  const {
    handleButtonClick,
    isEditing,
    isSaving
  } = useRenameableItem(contentType, id, onAction);
  const ExpandIcon = expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <Box alignItems="center" display="flex" gap={ITEM_GAP} minWidth={0} pl={expandable ? 0 : 3} width="100%">
      {expandable && <ExpandIcon color={expandIconDisabled ? 'disabled' : 'action'} fontSize="small" />}
      <Icon color="action" fontSize="small" />
      {isEditing ? (
        <RenameableItemEditingRenderer
          isSaving={isSaving}
          name={name}
          onAction={handleButtonClick}
          renameNameLabel={renameNameLabel}
        />
      ) : (
        <RenameableItemViewRenderer
          contentType={contentType}
          disabledByAction={disabledActions}
          menuActions={actions}
          name={name}
          onAction={handleButtonClick}
        />
      )}
    </Box>
  );
};

export default memo(withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem));
