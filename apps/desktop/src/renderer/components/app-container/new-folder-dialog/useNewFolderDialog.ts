import { type ChangeEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useNewFolderDialog = (
  onClose: () => void,
  onCreate: (name: string) => Promise<void>,
  existingFolderNames: readonly string[]
) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const trimmedName = name.trim();
  const hasDuplicateName = existingFolderNames.includes(trimmedName);

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setName(event.target.value);
  }, []);
  const handleCreate = useCallback(async () => {
    if (hasDuplicateName) return;

    try {
      await onCreate(trimmedName);
      setName('');
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('folder.error'));
    }
  }, [hasDuplicateName, onClose, onCreate, t, trimmedName]);

  return {
    error,
    handleCreate,
    handleNameChange,
    hasDuplicateName,
    isCreateDisabled: !trimmedName || hasDuplicateName,
    name,
    t
  };
};
