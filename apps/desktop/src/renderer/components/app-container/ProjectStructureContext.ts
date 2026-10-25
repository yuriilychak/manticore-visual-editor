import { createContext, useContext } from 'react';

import type { ProjectActionHandler } from '../../../types';

import type { ProjectContent } from '@manticore/project/types';
import type { VisibleProjectItem } from './types';

type ProjectStructureContextValue = {
  onAction: ProjectActionHandler;
  childrenIdsByParentId: Readonly<Record<number, readonly number[]>>;
  contentById: Readonly<Record<number, ProjectContent>>;
  projectName: string;
  projectPath: string;
  selection: readonly number[];
  selectedIdSet?: ReadonlySet<number>;
  visibleProjectItems: readonly VisibleProjectItem[];
  expandedItemIds: ReadonlySet<number>;
  isPasting: boolean;
};

export const ProjectStructureContext = createContext<ProjectStructureContextValue | null>(null);

export const useProjectStructure = () => {
  const projectStructure = useContext(ProjectStructureContext);

  if (!projectStructure) {
    throw new Error('useProjectStructure must be used within a ProjectStructureContext provider.');
  }

  return projectStructure;
};
