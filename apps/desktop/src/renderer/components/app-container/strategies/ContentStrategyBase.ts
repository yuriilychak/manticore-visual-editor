import { AssetType } from '../../../../types';

import { ContentAction } from '../common';
import { NotificationError } from '../constants';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValidation, NewContentValues } from '../types';

import { notifyUnavailableDesktopApi } from './helpers';
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

  protected getNamesAtParentId(parentId: number) {
    return this.#proxy.project?.content?.filter((item) => item.parentId === parentId).map((item) => item.name) ?? [];
  }

  protected async deleteContent(id: number) {
    const project = this.#proxy.project;
    if (!project || !window.manticore?.deleteProjectContent) {
      notifyUnavailableDesktopApi();
      return new ContentAction(id, 'delete-completed', { error: NotificationError.DeleteContent });
    }

    try {
      this.#proxy.replaceProject(await window.manticore.deleteProjectContent(project.path, id));
      return new ContentAction(id, 'delete-completed', {});
    } catch {
      return new ContentAction(id, 'delete-completed', { error: NotificationError.DeleteContent });
    }
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
