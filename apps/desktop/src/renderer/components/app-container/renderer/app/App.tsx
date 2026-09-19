import type { FC } from 'react';

import type { ApplicationAction } from '../../../../types';

import { useProjectStructure } from '../../ProjectStructureContext';

import { WelcomeScreen } from './welcome-screen';
import { WorkingScreen } from './working-screen';

type AppProps = {
  onAction: (action: ApplicationAction) => void;
};

const App: FC<AppProps> = ({ onAction }) => {
  const { path } = useProjectStructure();

  return path ? <WorkingScreen /> : <WelcomeScreen onAction={onAction} />;
};

export default App;
