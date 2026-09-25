import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ASSET_TYPE_LOCALE_KEY } from '../../../../types';

import { NewContentValidation } from '../common';
import type { NewContentStrategy, NewContentValues } from '../types';

const INITIAL_VALIDATION = new NewContentValidation();

export const useNewContentDialog = (strategy: NewContentStrategy, onClose: () => void) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [values, setValues] = useState<NewContentValues>({});
  const [validation, setValidation] = useState(INITIAL_VALIDATION);

  useEffect(() => {
    let current = true;

    void strategy.validate(values).then((result) => current && setValidation(result));

    return () => {
      current = false;
    };
  }, [strategy, values]);

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
      await strategy.create(values);
      setError('');
      setValues({});
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t(`${ASSET_TYPE_LOCALE_KEY[strategy.contentType]}.error`));
    }
  }, [onClose, strategy, t, validation.isValid, values]);

  return { error, handleCreate, handleFieldSelect, onFieldChange, t, validation, values };
};
