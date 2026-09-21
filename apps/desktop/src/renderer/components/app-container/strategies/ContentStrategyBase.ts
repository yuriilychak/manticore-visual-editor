import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
import { ProjectProxy } from '../ProjectProxy';

import type { ContentStrategyResult } from './types';

export abstract class ContentStrategyBase {
  abstract readonly fields: readonly NewContentField[];

  abstract create(values: NewContentValues): Promise<void>;
  abstract handle(action: string, id: number, data?: unknown): void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
  abstract validate(values: NewContentValues): Promise<NewContentValidation>;

  readonly #contentType: AssetType;
  readonly #proxy: ProjectProxy;

  constructor(proxy: ProjectProxy, contentType: AssetType) {
    this.#contentType = contentType;
    this.#proxy = proxy;
  }

  get contentType() {
    return this.#contentType;
  }

  protected get projectProxy() {
    return this.#proxy;
  }

  protected getNamesAtProjectPath(parentPath: string) {
    const project = this.#proxy.project;
    if (!project) return [];

    const content = project.content;
    if (!content) return [];

    const folder = project.folders.find((item) => item.name === parentPath);
    const projectFolder = content.find((item) => item.type === AssetType.ProjectFolder && item.name === parentPath);
    const parentId = folder ? folder.id : projectFolder ? projectFolder.id : undefined;

    return content.filter((item) => item.parentId === parentId).map((item) => item.name);
  }

  protected getNamesAtParentId(parentId: number) {
    return this.#proxy.project?.content?.filter((item) => item.parentId === parentId).map((item) => item.name) ?? [];
  }

  setParentId(parentId: number) {
    void parentId;
  }
  setParentPath(parentPath: string) {
    void parentPath;
  }
}
