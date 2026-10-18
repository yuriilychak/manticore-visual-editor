import type { ProjectContent } from '@manticore/project/types';

import type { ProjectInfo } from '../../types';

export class ProjectProxy {
  #currentProject: ProjectInfo | null = null;
  #onProjectChange?: (project: ProjectInfo) => void;

  setOnProjectChange(onProjectChange?: (project: ProjectInfo) => void) {
    this.#onProjectChange = onProjectChange;
  }

  addContent(content: ProjectContent) {
    this.#update((project) => ({ ...project, content: project.content?.concat(content) }));
  }

  updateContent(id: number, content: ProjectContent) {
    this.#update((project) => ({
      ...project,
      content: project.content?.map((currentContent) => (currentContent.id === id ? content : currentContent))
    }));
  }

  updateProjectName(name: string) {
    this.#update((project) => ({ ...project, name }));
  }

  replaceProject(project: ProjectInfo) {
    this.#setProject(project);
    this.#onProjectChange?.(project);
  }

  #setProject(project: ProjectInfo) {
    this.#currentProject = project;
  }

  #update(updater: (project: ProjectInfo) => ProjectInfo) {
    if (!this.#currentProject) return;

    const project = updater(this.#currentProject!);
    this.#setProject(project);
    this.#onProjectChange?.(project);
  }
}
