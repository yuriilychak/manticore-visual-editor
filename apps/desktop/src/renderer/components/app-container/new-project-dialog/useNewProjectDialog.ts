import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NewProjectOptions, ProjectCreationValidation } from '../../../types';

const DEFAULT_VALIDATION: ProjectCreationValidation = { isAvailable: false };

export const useNewProjectDialog = (
  onClose: () => void,
  onCreate: (options: NewProjectOptions) => Promise<void>,
  onSelectLocation: () => Promise<string>,
  onValidate: (options: NewProjectOptions) => Promise<ProjectCreationValidation>
) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [validation, setValidation] = useState(DEFAULT_VALIDATION);

  useEffect(() => {
    if (!name.trim() || !parentPath) return;
    let current = true;
    void onValidate({ name: name.trim(), parentPath }).then((result) => current && setValidation(result));

    return () => {
      current = false;
    };
  }, [name, onValidate, parentPath]);

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setValidation(DEFAULT_VALIDATION);
  }, []);

  const handleSelectLocation = useCallback(async () => {
    const location = await onSelectLocation();

    if (location && location !== parentPath) {
      setParentPath(location);
      setValidation(DEFAULT_VALIDATION);
    }
  }, [onSelectLocation, parentPath]);

  const handleCreate = useCallback(async () => {
    try {
      await onCreate({ name: name.trim(), parentPath });
      setError('');
      setName('');
      setParentPath('');
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('project.error'));
    }
  }, [name, onClose, onCreate, parentPath, t]);

  return {
    error,
    handleCreate,
    handleNameChange,
    handleSelectLocation,
    isCreateDisabled: !name.trim() || !parentPath || !validation.isAvailable,
    name,
    parentPath,
    t,
    validation
  };
};
