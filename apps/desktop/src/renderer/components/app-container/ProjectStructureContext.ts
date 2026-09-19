import { createContext, useContext } from 'react';

import type { BundleConfig, FolderConfig, ProjectActionHandler } from '../../../types';

type ProjectStructureContextValue = {
  bundles: Map<string, BundleConfig>;
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
