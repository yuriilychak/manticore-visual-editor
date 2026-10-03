import { memo, type FC, type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, Tooltip } from '@mui/material';

import type { ActionButtonConfig } from './types';

type RenameableItemActionButtonsProps = {
  actions: ActionButtonConfig[];
  disabledByAction: Record<string, boolean>;
  onAction: (action: string) => void;
};

const RenameableItemActionButtons: FC<RenameableItemActionButtonsProps> = ({ actions, disabledByAction, onAction }) => {
  const { t } = useTranslation();
  const handleActionClick: MouseEventHandler<HTMLButtonElement> = event => {
    event.stopPropagation();
    onAction(event.currentTarget.dataset.action ?? '');
  };

  return actions.map(({ action, tooltipLocale, Icon }) => (
    <Tooltip key={action} title={t(tooltipLocale)}>
      <span>
        <IconButton
          aria-label={t(tooltipLocale)}
          data-action={action}
          disabled={disabledByAction[action]}
          onClick={handleActionClick}
          size="small"
          type="button"
        >
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ));
};

export default memo(RenameableItemActionButtons);
