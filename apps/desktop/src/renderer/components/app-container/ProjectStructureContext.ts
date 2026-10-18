import { createContext, useContext } from 'react';

import type { ProjectActionHandler } from '../../../types';

import type { ProjectProxy } from './ProjectProxy';
import type { VisibleProjectItem } from './types';

type ProjectStructureContextValue = {
  onAction: ProjectActionHandler;
  projectName: string;
  projectPath: string;
  projectProxy: ProjectProxy;
  selection: readonly number[];
  selectedIdSet?: ReadonlySet<number>;
  visibleProjectItems: readonly VisibleProjectItem[];
  expandedItemIds: ReadonlySet<number>;
};

export const ProjectStructureContext = createContext<ProjectStructureContextValue | null>(null);

export const useProjectStructure = () => {
  const projectStructure = useContext(ProjectStructureContext);

  if (!projectStructure) {
    throw new Error('useProjectStructure must be used within a ProjectStructureContext provider.');
  }

  return projectStructure;
};
