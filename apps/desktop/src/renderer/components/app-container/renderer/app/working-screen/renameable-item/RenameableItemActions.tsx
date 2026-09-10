import { type FC, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, Tooltip } from '@mui/material';

import type { ActionButtonConfig } from './types';

type RenameableItemActionsProps = {
  actions: ActionButtonConfig[];
  className?: string;
  disabledByAction: Record<string, boolean>;
  onClick: (action: string) => void;
};

const RenameableItemActions: FC<RenameableItemActionsProps> = ({ actions, className, disabledByAction, onClick }) => {
  const { t } = useTranslation();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => onClick(event.currentTarget.dataset.action ?? '');

  return actions.map(({ action, tooltipLocale, Icon }) => (
    <Tooltip key={action} title={t(tooltipLocale)}>
      <span>
        <IconButton
          aria-label={t(tooltipLocale)}
          className={className}
          data-action={action}
          disabled={disabledByAction[action]}
          onClick={handleClick}
          size="small"
          type="button"
        >
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ));
};

export default RenameableItemActions;
