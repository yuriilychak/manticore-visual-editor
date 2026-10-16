import type { ProjectContent } from '@manticore/project/types';

import { AssetType } from '../../../types';

import type { ProjectInfo } from '../../types';

import { NO_BUNDLE_ID } from './constants';
import type { VisibleProjectItem } from './types';

export class ProjectProxy {
  #bundleIds: readonly number[] = [];
  #childrenIdsByParentId: ReadonlyMap<number, readonly number[]> = new Map();
  #contentById: ReadonlyMap<number, ProjectContent> = new Map();
  #currentProject: ProjectInfo | null = null;
  #onProjectChange?: (project: ProjectInfo) => void;
  #rootItemIds: readonly number[] = [];
  #rootNodeId: number | undefined;

  setOnProjectChange(onProjectChange?: (project: ProjectInfo) => void) {
    this.#onProjectChange = onProjectChange;
  }

  get project() {
    return this.#currentProject;
  }

  get bundles() {
    return this.#bundleIds.map((id) => this.getContent(id)!);
  }

  get rootNodeId() {
    return this.#rootNodeId;
  }

  getChildrenIds(itemId: number) {
    return itemId === 0 ? this.#rootItemIds : this.#childrenIdsByParentId.get(itemId) ?? [];
  }

  getVisibleProjectItems(expandedItemIds: ReadonlySet<number>, parentId = 0, depth = 0): VisibleProjectItem[] {
    const items: VisibleProjectItem[] = [];

    for (const id of this.getChildrenIds(parentId)) {
      items.push({ depth, id });
      if (expandedItemIds.has(id)) items.push(...this.getVisibleProjectItems(expandedItemIds, id, depth + 1));
    }

    return items;
  }

  hasChildren(itemId: number) {
    return this.getChildrenIds(itemId).length > 0;
  }

  getSelectedBundleId(bundleId: number) {
    return this.#bundleIds.includes(bundleId) ? bundleId : this.#bundleIds[0] ?? NO_BUNDLE_ID;
  }

  getContent(id: number) {
    return this.#contentById.get(id);
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
    const content = project.content ?? [];
    this.#contentById = new Map(content.map((item) => [item.id, item]));
    const uniqueContent = Array.from(this.#contentById.values());
    const childrenIdsByParentId = new Map<number, number[]>();
    for (const { id, parentId } of uniqueContent) {
      const children = childrenIdsByParentId.get(parentId) ?? [];
      children.push(id);
      childrenIdsByParentId.set(parentId, children);
    }
    const isFolder = (item: ProjectContent) => item.type === AssetType.ProjectFolder || item.type === AssetType.BundleFolder;
    const compareIds = (leftId: number, rightId: number) => {
      const left = this.getContent(leftId)!;
      const right = this.getContent(rightId)!;
      const folderOrder = Number(isFolder(right)) - Number(isFolder(left));
      return folderOrder || left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }) || left.id - right.id;
    };
    childrenIdsByParentId.forEach((ids) => ids.sort(compareIds));
    this.#childrenIdsByParentId = childrenIdsByParentId;
    this.#rootNodeId = uniqueContent.find((item) => item.type === AssetType.ProjectFolder && item.parentId === 0 && !item.name)?.id;
    const rootIds = childrenIdsByParentId.get(0) ?? [];
    this.#rootItemIds = this.#rootNodeId === undefined
      ? rootIds
      : (childrenIdsByParentId.get(this.#rootNodeId) ?? []).concat(rootIds.filter((id) => id !== this.#rootNodeId));
    this.#bundleIds = uniqueContent.reduce<number[]>((ids, { id, type }) => {
      if (type === AssetType.Bundle) ids.push(id);
      return ids;
    }, []);
  }

  #update(updater: (project: ProjectInfo) => ProjectInfo) {
    if (!this.#currentProject) return;

    this.setProject(updater(this.#currentProject));
    this.#onProjectChange?.(this.#currentProject);
  }
}
