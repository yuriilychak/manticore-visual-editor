import { createContext, useContext } from 'react';

import type { FolderConfig, ProjectActionHandler } from '../../../types';
import type { ProjectContent } from '../../../project/types';

type ProjectStructureContextValue = {
  content: ProjectContent[];
  folders: FolderConfig[];
  name: string;
  onAction: ProjectActionHandler;
  path: string;
};

export const ProjectStructureContext = createContext<ProjectStructureContextValue | null>(null);

export const useProjectStructure = () => {
  const projectStructure = useContext(ProjectStructureContext);

  if (!projectStructure) {
    throw new Error('useProjectStructure must be used within a ProjectStructureContext provider.');
  }

  return projectStructure;
};
