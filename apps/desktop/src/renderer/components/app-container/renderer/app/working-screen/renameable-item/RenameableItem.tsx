import { type FC, memo, type MutableRefObject, useEffect } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box } from '@mui/material';

import type { AssetType, ProjectActionHandler } from '../../../../../../../types';
import { withLocalizedProps } from '../../../../../../localization';

import { ITEM_GAP, ITEM_ICON_SIZE, RENAMEABLE_ITEM_LOCALE_KEYS } from './constants';
import RenameableItemEditingRenderer from './RenameableItemEditingRenderer';
import RenameableItemViewRenderer from './RenameableItemViewRenderer';
import type { RenameableItemLocalizedProps } from './types';
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
  menuActionRef: MutableRefObject<((action: string) => void) | null>;
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
  menuActionRef
}) => {
  const {
    handleButtonClick,
    isEditing,
    isSaving
  } = useRenameableItem(contentType, id, onAction);
  useEffect(() => {
    menuActionRef.current = handleButtonClick;
    return () => {
      menuActionRef.current = null;
    };
  }, [handleButtonClick, menuActionRef]);
  const ExpandIcon = expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <Box
      alignItems="center"
      display="flex"
      gap={ITEM_GAP}
      height={24}
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
        <RenameableItemViewRenderer
          name={name}
        />
      )}
    </Box>
  );
};

export default memo(withLocalizedProps(RENAMEABLE_ITEM_LOCALE_KEYS)(RenameableItem));
