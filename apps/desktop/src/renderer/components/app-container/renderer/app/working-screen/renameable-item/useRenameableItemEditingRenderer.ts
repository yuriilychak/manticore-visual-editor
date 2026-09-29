import { type ChangeEvent, type ChangeEventHandler, useCallback, useMemo, useRef, useState } from 'react';

type RenameableItemEditingActionHandler = (action: string, data?: string) => Promise<void>;

export const useRenameableItemEditingRenderer = (
  name: string,
  isSaving: boolean,
  onAction: RenameableItemEditingActionHandler
) => {
  const [editedName, setEditedName] = useState(name);
  const trimmedName = editedName.trim();
  const trimmedNameRef = useRef(trimmedName);
  trimmedNameRef.current = trimmedName;
  const disabledByAction = useMemo(() => ({
    cancel: isSaving,
    save: !trimmedName || isSaving
  }), [isSaving, trimmedName]);

  const handleSubmit: ChangeEventHandler<HTMLFormElement> = event => {
    event.preventDefault();
    void onAction('save', trimmedName);
  };

  const handleAction = useCallback((action: string) => {
    void onAction(action, trimmedNameRef.current);
  }, [onAction]);
  
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => setEditedName(event.target.value);

  return { disabledByAction, editedName, handleAction, handleNameChange, handleSubmit, trimmedName };
};
