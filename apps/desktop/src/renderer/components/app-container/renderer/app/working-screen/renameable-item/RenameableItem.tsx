import { type FC, type ReactNode } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';
import type { AssetType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { RENAMEABLE_ITEM_ACTIONS, RENAMEABLE_ITEM_LOCALE_KEYS } from './constants';
import RenameableItemEditingRenderer from './RenameableItemEditingRenderer';
import RenameableItemViewRenderer from './RenameableItemViewRenderer';
import type { ActionButtonConfig, RenameableItemLocalizedProps } from './types';
import { useRenameableItem } from './useRenameableItem';

type RenameableItemProps = {
  contentType: AssetType;
  id: number;
  Icon?: SvgIconComponent;
  icon?: ReactNode;
  name: string;
  onAction: ProjectActionHandler;
  disableNameTooltip?: boolean;
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
  disableNameTooltip = false,
  renameNameLabel,
  disabledActions = {},
  actions = RENAMEABLE_ITEM_ACTIONS.empty
}) => {
  const {
    handleButtonClick,
    isEditing,
    isSaving
  } = useRenameableItem(contentType, id, onAction);
  const itemIcon = Icon ? <Icon color="action" fontSize="small" /> : icon;

  return isEditing ? (
    <RenameableItemEditingRenderer
      isSaving={isSaving}
      name={name}
      onAction={handleButtonClick}
      renameNameLabel={renameNameLabel}
    >
      {itemIcon}
    </RenameableItemEditingRenderer>
  ) : (
    <RenameableItemViewRenderer
      contentType={contentType}
      disableNameTooltip={disableNameTooltip}
      disabledByAction={disabledActions}
      menuActions={actions}
      name={name}
      onAction={handleButtonClick}
    >
      {itemIcon}
    </RenameableItemViewRenderer>
  );
};

export default withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem);
