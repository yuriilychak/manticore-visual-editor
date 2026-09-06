import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import type { ApplicationAction } from '../../../../../types';

import { INITIAL_MENU_ANCHORS, MENUS } from './constants';
import type {
  MenubarHandlers,
  MenubarItemId,
  MenubarItemStateGetter,
  MenubarMenuAnchors,
  MenubarMenuItemType,
  MenuId
} from './types';

export const useMenubar = (
  onAction: (action: ApplicationAction) => void,
  selectedActionIds: readonly ApplicationAction[],
  disabledItemIds: readonly MenubarItemId[]
) => {
  const [anchors, setAnchors] = useState<MenubarMenuAnchors>(INITIAL_MENU_ANCHORS);
  const buttons = useMemo(() => MENUS.filter(({ isMenubarButton }) => isMenubarButton), []);

  const closeMenus = useCallback(() => setAnchors(INITIAL_MENU_ANCHORS), []);
  const handleOpenMenu = useCallback(({ currentTarget }: MouseEvent<HTMLElement>) => {
    const menuId = currentTarget.dataset.id as MenuId;

    if (disabledItemIds.includes(menuId)) return;

    setAnchors((currentAnchors) => ({ ...currentAnchors, [menuId]: currentTarget }));
  }, [disabledItemIds]);
  const handleAction = useCallback(
    ({ currentTarget }: MouseEvent<HTMLElement>) => {
      const action = currentTarget.dataset.id as ApplicationAction;

      if (disabledItemIds.includes(action)) return;

      onAction(action);
      closeMenus();
    },
    [closeMenus, disabledItemIds, onAction]
  );
  const handlers = useMemo<MenubarHandlers>(
    () => ({ action: handleAction, submenu: handleOpenMenu }),
    [handleAction, handleOpenMenu]
  );
  const getSelected = useCallback<MenubarItemStateGetter>(
    (type: MenubarMenuItemType, id: MenubarItemId) =>
      type === 'action' && selectedActionIds.includes(id as ApplicationAction),
    [selectedActionIds]
  );
  const getDisabled = useCallback<MenubarItemStateGetter>(
    (_type: MenubarMenuItemType, id: MenubarItemId) => disabledItemIds.includes(id),
    [disabledItemIds]
  );

  return { anchors, buttons, closeMenus, getDisabled, getSelected, handlers };
};
