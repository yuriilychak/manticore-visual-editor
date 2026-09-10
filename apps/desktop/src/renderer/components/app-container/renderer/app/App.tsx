import type { FC } from 'react';

import type { ApplicationAction } from '../../../../types';

import { WelcomeScreen } from './welcome-screen';
import { WorkingScreen } from './working-screen';

type AppProps = {
  onAction: (action: ApplicationAction) => void;
  onRenameProject?: (name: string) => Promise<void>;
  projectName?: string;
  projectPath: string;
};

const App: FC<AppProps> = ({ onAction, onRenameProject, projectName, projectPath }) =>
  projectPath ? <WorkingScreen onRenameProject={onRenameProject} projectName={projectName ?? ''} /> : <WelcomeScreen onAction={onAction} />;

export default App;
