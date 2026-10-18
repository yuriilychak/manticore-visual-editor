import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ASSET_TYPE_LOCALE_KEY, type ProjectActionHandler } from '../../../../../types';

import { NewContentValidation } from '../../common';
import type { NewContentContext, NewContentStrategy, NewContentValues } from '../../types';

const INITIAL_VALIDATION = new NewContentValidation();

export const useNewContentDialog = (
  strategy: NewContentStrategy,
  projectPath: string,
  siblingNames: readonly string[],
  context: NewContentContext,
  onAction: ProjectActionHandler,
  onClose: () => void
) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [values, setValues] = useState<NewContentValues>({});
  const [validation, setValidation] = useState(INITIAL_VALIDATION);

  useEffect(() => {
    let current = true;

    void strategy.validate(values, siblingNames).then((result) => current && setValidation(result));

    return () => {
      current = false;
    };
  }, [siblingNames, strategy, values]);

  const onFieldChange = useCallback((value: string, key: string) => {
    setError('');
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setValidation(INITIAL_VALIDATION);
  }, []);
  const handleFieldSelect = useCallback(
    async (key: string, selectValue: () => Promise<string>) => {
      const value = await selectValue();
      if (value) onFieldChange(value, key);
    },
    [onFieldChange]
  );
  const handleCreate = useCallback(async () => {
    if (!validation.isValid) return;

    try {
      const result = await strategy.create(values, projectPath, context);
      if (result) await onAction(result.action, strategy.contentType, result.id, result.data);
      setError('');
      setValues({});
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t(`${ASSET_TYPE_LOCALE_KEY[strategy.contentType]}.error`));
    }
  }, [context, onAction, onClose, projectPath, strategy, t, validation.isValid, values]);

  return { error, handleCreate, handleFieldSelect, onFieldChange, t, validation, values };
};
