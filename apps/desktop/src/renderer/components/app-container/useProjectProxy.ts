import { useCallback, useState } from 'react';

import type { FolderConfig } from '../../../types';

import type { ProjectInfo } from '../../types';

export const useProjectProxy = () => {
  const [project, setProject] = useState<ProjectInfo | null>(null);

  const addFolder = useCallback((folder: FolderConfig) => {
    setProject(
      (currentProject) =>
        currentProject && {
          ...currentProject,
          folders: currentProject.folders.concat(folder)
        }
    );
  }, []);
  const renameFolder = useCallback((id: number, folder: FolderConfig) => {
    setProject(
      (currentProject) =>
        currentProject && {
          ...currentProject,
          folders: currentProject.folders.map((currentFolder) => (currentFolder.id === id ? folder : currentFolder))
        }
    );
  }, []);
  const renameProject = useCallback((name: string) => {
    setProject((currentProject) => currentProject && { ...currentProject, name });
  }, []);
  const replaceProject = useCallback((project: ProjectInfo) => setProject(project), []);

  return { addFolder, project, renameFolder, renameProject, replaceProject };
};
