import { createContext, useContext } from 'react';

import type { ApplicationAction } from '../../types';

type ApplicationActionHandler = (action: ApplicationAction) => void;

export const ApplicationActionContext = createContext<ApplicationActionHandler | null>(null);

export const useApplicationAction = () => {
  const onAction = useContext(ApplicationActionContext);

  if (!onAction) throw new Error('useApplicationAction must be used within an ApplicationActionContext provider.');

  return onAction;
};
