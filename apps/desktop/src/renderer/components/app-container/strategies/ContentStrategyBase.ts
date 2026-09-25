import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentAction } from '../common';
import type { ContentStrategy, ContentStrategyResult } from './types';

export abstract class ContentStrategyBase implements ContentStrategy {
  abstract readonly fields: readonly NewContentField[];

  abstract create(values: NewContentValues): Promise<void>;
  abstract handle(contentAction: ContentAction): void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
  abstract validate(values: NewContentValues): Promise<NewContentValidation>;

  readonly #contentType: AssetType;
  readonly #fieldValues = new Map<string, unknown>();
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

  setField(key: string, value: unknown) {
    this.#fieldValues.set(key, value);
  }

  setFields(fields: Record<string, unknown>) {
    Object.entries(fields).forEach(([key, value]) => this.setField(key, value));
  }

  protected getField<T>(key: string, defaultValue: T) {
    const value = this.#fieldValues.get(key);

    return value === undefined ? defaultValue : value as T;
  }
}
