import { createContext, useContext } from 'react';

import type { ApplicationActionHandler } from './types';

export const ApplicationActionContext = createContext<ApplicationActionHandler | null>(null);

export const useApplicationAction = () => {
  const onAction = useContext(ApplicationActionContext);

  if (!onAction) throw new Error('useApplicationAction must be used within an ApplicationActionContext provider.');

  return onAction;
};
