import type { ProjectContent } from '@manticore/project/types';

import type { ProjectInfo } from '../../types';

export class ProjectProxy {
  #currentProject: ProjectInfo | null = null;
  #onProjectChange?: (project: ProjectInfo) => void;

  setOnProjectChange(onProjectChange?: (project: ProjectInfo) => void) {
    this.#onProjectChange = onProjectChange;
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

  moveBundle(id: number, bundle: ProjectContent) {
    this.renameBundle(id, bundle);
  }

  moveContent(id: number, content: ProjectContent) {
    this.renameBundle(id, content);
  }

  renameBundle(id: number, bundle: ProjectContent) {
    this.#update((project) => ({
      ...project,
      content: project.content?.map((currentContent) => (currentContent.id === id ? bundle : currentContent))
    }));
  }

  renameProject(name: string) {
    this.#update((project) => ({ ...project, name }));
  }

  replaceProject(project: ProjectInfo) {
    this.setProject(project);
    this.#onProjectChange?.(project);
  }

  setProject(project: ProjectInfo) {
    this.#currentProject = project;
  }

  #update(updater: (project: ProjectInfo) => ProjectInfo) {
    if (!this.#currentProject) return;

    this.#currentProject = updater(this.#currentProject);
    this.#onProjectChange?.(this.#currentProject);
  }
}
