import type { FC } from 'react';

import type { ProjectActionHandler } from '../../../../../types';
import type { ApplicationAction } from '../../../../types';

import { WelcomeScreen } from './welcome-screen';
import { WorkingScreen } from './working-screen';

type AppProps = {
  onAction: (action: ApplicationAction) => void;
  onWorkingScreenAction: ProjectActionHandler;
  projectName?: string;
  projectPath: string;
};

const App: FC<AppProps> = ({ onAction, onWorkingScreenAction, projectName, projectPath }) => {
  return projectPath ? (
    <WorkingScreen onAction={onWorkingScreenAction} projectName={projectName ?? ''} />
  ) : <WelcomeScreen onAction={onAction} />;
};

export default App;
