import { type FC, memo, type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, InputAdornment, Tooltip } from '@mui/material';

import { ITEM_ACTION_BUTTON_SIZE, ITEM_ICON_SIZE, RENAMEABLE_ITEM_ACTIONS } from './constants';

type RenameableItemActionButtonsProps = {
  isSaveDisabled: boolean;
  isSaving: boolean;
  onAction: (action: string) => void;
};

const RenameableItemActionButtons: FC<RenameableItemActionButtonsProps> = ({ isSaveDisabled, isSaving, onAction }) => {
  const { t } = useTranslation();
  const handleActionClick: MouseEventHandler<HTMLButtonElement> = event => {
    event.stopPropagation();
    onAction(event.currentTarget.dataset.action ?? '');
  };

  return (
    <InputAdornment position="end">
      {RENAMEABLE_ITEM_ACTIONS.editing.map(({ action, tooltipLocale, Icon }) => (
        <Tooltip key={action} title={t(tooltipLocale)}>
          <span>
            <IconButton
              aria-label={t(tooltipLocale)}
              data-action={action}
              disabled={isSaving || (action === 'save' && isSaveDisabled)}
              onClick={handleActionClick}
              size="small"
              sx={{ height: ITEM_ACTION_BUTTON_SIZE, width: ITEM_ACTION_BUTTON_SIZE }}
              type="button"
            >
              <Icon sx={{ fontSize: ITEM_ICON_SIZE }} />
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </InputAdornment>
  );
};

export default memo(RenameableItemActionButtons);
