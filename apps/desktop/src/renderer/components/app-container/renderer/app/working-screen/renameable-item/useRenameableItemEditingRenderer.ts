import { type ChangeEvent, type ChangeEventHandler, useCallback, useRef, useState } from 'react';

import type { RenameableItemEditingActionHandler } from './types';

export const useRenameableItemEditingRenderer = (
  name: string,
  onAction: RenameableItemEditingActionHandler
) => {
  const [editedName, setEditedName] = useState(name);
  const trimmedName = editedName.trim();
  const trimmedNameRef = useRef(trimmedName);
  trimmedNameRef.current = trimmedName;
  const handleAction = useCallback((action: string) => void onAction(action, trimmedNameRef.current), [onAction]);

  const handleSubmit: ChangeEventHandler<HTMLFormElement> = event => {
    event.preventDefault();
    handleAction('save');
  };
  
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => setEditedName(event.target.value);

  return { editedName, handleAction, handleNameChange, handleSubmit, trimmedName };
};
