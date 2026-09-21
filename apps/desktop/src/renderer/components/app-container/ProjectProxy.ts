import type { Dispatch, SetStateAction } from 'react';

import type { ProjectContent } from '../../../project/types';
import type { FolderConfig } from '../../../types';

import type { ProjectInfo } from '../../types';

export class ProjectProxy {
  #currentProject: ProjectInfo | null = null;
  readonly #setProject: Dispatch<SetStateAction<ProjectInfo | null>>;

  constructor(setProject: Dispatch<SetStateAction<ProjectInfo | null>>) {
    this.#setProject = setProject;
  }

  get project() {
    return this.#currentProject;
  }

  addBundle(bundle: ProjectContent) {
    this.addContent(bundle);
  }

  addContent(content: ProjectContent) {
    this.#update((project) => ({ ...project, content: project.content?.concat(content) }));
  }

  addFolder(folder: FolderConfig) {
    this.#update((project) => ({ ...project, folders: project.folders.concat(folder) }));
  }

  moveBundle(id: number, bundle: ProjectContent) {
    this.renameBundle(id, bundle);
  }

  moveFolders(folders: FolderConfig[]) {
    const movedFoldersById = new Map(folders.map((folder) => [folder.id, folder]));

    this.#update((project) => ({
      ...project,
      folders: project.folders.map((folder) => movedFoldersById.get(folder.id) ?? folder)
    }));
  }

  renameBundle(id: number, bundle: ProjectContent) {
    this.#update((project) => ({
      ...project,
      content: project.content?.map((currentContent) => (currentContent.id === id ? bundle : currentContent))
    }));
  }

  renameFolder(id: number, folder: FolderConfig) {
    this.#update((project) => ({
      ...project,
      folders: project.folders.map((currentFolder) => (currentFolder.id === id ? folder : currentFolder)
      )
    }));
  }

  renameProject(name: string) {
    this.#update((project) => ({ ...project, name }));
  }

  replaceProject(project: ProjectInfo) {
    this.#currentProject = project;
    this.#setProject(project);
  }

  #update(updater: (project: ProjectInfo) => ProjectInfo) {
    if (!this.#currentProject) return;

    this.#currentProject = updater(this.#currentProject);
    this.#setProject(this.#currentProject);
  }
}
