import { createContext, useContext } from 'react';

import type { ProjectActionHandler } from '../../../types';
import type { ProjectInfo } from '../../types';

type ProjectStructureContextValue = {
  onAction: ProjectActionHandler;
  project: ProjectInfo | null;
};

export const ProjectStructureContext = createContext<ProjectStructureContextValue | null>(null);

export const useProjectStructure = () => {
  const projectStructure = useContext(ProjectStructureContext);

  if (!projectStructure) {
    throw new Error('useProjectStructure must be used within a ProjectStructureContext provider.');
  }

  return projectStructure;
};
