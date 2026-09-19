import { type ChangeEvent, type FormEvent, type MouseEvent, useMemo, useState } from 'react';

import type { ContentType, ProjectActionHandler } from '../../../../../../../types';

import { RENAMEABLE_ITEM_ACTIONS } from './constants';
import type { ActionButtonConfig } from './types';

export const useRenameableItem = (
  contentType: ContentType,
  id: number,
  name: string,
  onAction: ProjectActionHandler,
  disabledActions: Record<string, boolean> = {},
  actions: ActionButtonConfig[] = RENAMEABLE_ITEM_ACTIONS.empty
) => {
  const [isEditing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isSaving, setSaving] = useState(false);
  const itemActions = useMemo(
    () => (isEditing ? RENAMEABLE_ITEM_ACTIONS.editing : actions.concat(RENAMEABLE_ITEM_ACTIONS.viewProject)),
    [actions, isEditing]
  );
  const trimmedName = editedName.trim();
  const disabledByAction: Record<string, boolean> = {
    ...disabledActions,
    cancel: isSaving,
    save: !trimmedName || isSaving
  };

  const saveName = async () => {
    if (!trimmedName) return;

    setSaving(true);
    try {
      await onAction('rename', contentType, id, trimmedName);
      setEditing(false);
    } catch {
      // The caller is responsible for presenting a failed-save notification.
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void saveName();
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => setEditedName(event.target.value);

  const handleButtonClick = (action: string) => {
    switch (action) {
      case 'cancel':
        setEditedName(name);
        setEditing(false);
        break;
      case 'rename':
        setEditing(true);
        break;
      case 'save':
        void saveName();
        break;
      default:
        void onAction(action, contentType, id);
    }
  };

  const handleActionButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    handleButtonClick(event.currentTarget.dataset.action ?? '');
  };

  return {
    boxComponent: isEditing ? ('form' as const) : ('div' as const),
    disabledByAction,
    editedName,
    handleActionButtonClick,
    handleNameChange,
    handleSubmit,
    isEditing,
    itemActions,
    trimmedName
  };
};
