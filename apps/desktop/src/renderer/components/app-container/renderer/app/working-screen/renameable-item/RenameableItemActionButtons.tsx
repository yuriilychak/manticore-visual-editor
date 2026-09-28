import type { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, Tooltip } from '@mui/material';

import type { ActionButtonConfig } from './types';

type RenameableItemActionButtonsProps = {
  actions: ActionButtonConfig[];
  disabledByAction: Record<string, boolean>;
  onActionClick: MouseEventHandler<HTMLElement>;
};

const RenameableItemActionButtons: FC<RenameableItemActionButtonsProps> = ({ actions, disabledByAction, onActionClick }) => {
  const { t } = useTranslation();

  return actions.map(({ action, tooltipLocale, Icon, icon }) => (
    <Tooltip key={action} title={t(tooltipLocale)}>
      <span>
        <IconButton
          aria-label={t(tooltipLocale)}
          data-action={action}
          disabled={disabledByAction[action]}
          onClick={onActionClick}
          size="small"
          type="button"
        >
          {Icon ? <Icon fontSize="small" /> : icon}
        </IconButton>
      </span>
    </Tooltip>
  ));
};

export default RenameableItemActionButtons;
