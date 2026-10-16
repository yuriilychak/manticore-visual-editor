import { createContext, useContext } from 'react';

import type { ProjectActionHandler } from '../../../types';

import type { ProjectInfo } from '../../types';

import type { ProjectProxy } from './ProjectProxy';

type ProjectStructureContextValue = {
  onAction: ProjectActionHandler;
  onToggleExpanded: (id: number) => void;
  project: ProjectInfo | null;
  projectProxy: ProjectProxy;
  selection: readonly number[];
  selectedIdSet?: ReadonlySet<number>;
  expandedItemIds: readonly number[];
};

export const ProjectStructureContext = createContext<ProjectStructureContextValue | null>(null);

export const useProjectStructure = () => {
  const projectStructure = useContext(ProjectStructureContext);

  if (!projectStructure) {
    throw new Error('useProjectStructure must be used within a ProjectStructureContext provider.');
  }

  return projectStructure;
};
