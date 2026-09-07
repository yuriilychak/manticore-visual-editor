import type { FC } from 'react';

import type { ApplicationAction } from '../../../../types';

import { WelcomeScreen } from './welcome-screen';
import { WorkingScreen } from './working-screen';

type AppProps = {
  onAction: (action: ApplicationAction) => void;
  projectPath: string;
};

const App: FC<AppProps> = ({ onAction, projectPath }) =>
  projectPath ? <WorkingScreen /> : <WelcomeScreen onAction={onAction} />;

export default App;
