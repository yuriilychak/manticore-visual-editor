import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import type { ApplicationAction } from '../../../../../types';

import { INITIAL_MENU_ANCHORS, MENUS } from './constants';
import type { MenubarMenuItem, MenuId } from './types';

export const useMenubar = (
  onAction: (action: ApplicationAction) => void,
  selectedActionIds: readonly ApplicationAction[]
) => {
  const [anchors, setAnchors] = useState<Record<MenuId, HTMLElement | null>>(INITIAL_MENU_ANCHORS);
  const buttons = useMemo(() => MENUS.filter(({ isMenubarButton }) => isMenubarButton), []);

  const closeMenus = useCallback(() => setAnchors(INITIAL_MENU_ANCHORS), []);
  const handleOpenMenu = useCallback(
    ({ currentTarget }: MouseEvent<HTMLElement>) =>
      setAnchors((currentAnchors) => ({ ...currentAnchors, [currentTarget.dataset.id as MenuId]: currentTarget })),
    []
  );
  const handleAction = useCallback(
    ({ currentTarget }: MouseEvent<HTMLElement>) => {
      onAction(currentTarget.dataset.id as ApplicationAction);
      closeMenus();
    },
    [closeMenus, onAction]
  );
  const handlers = useMemo(() => ({ action: handleAction, submenu: handleOpenMenu }), [handleAction, handleOpenMenu]);
  const getSelected = useCallback(
    (type: MenubarMenuItem['type'], id: MenubarMenuItem['id']) =>
      type === 'action' && selectedActionIds.includes(id as ApplicationAction),
    [selectedActionIds]
  );

  return { anchors, buttons, closeMenus, getSelected, handlers };
};
