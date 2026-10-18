import { AssetType } from '../../../../types';

import { ContentAction } from '../common';
import { NotificationError } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { CreateContentResult, NewContentContext, NewContentField, NewContentValidation, NewContentValues } from '../types';

import type { ContentStrategy, ContentStrategyResult } from './types';

export abstract class ContentStrategyBase implements ContentStrategy {
  abstract readonly fields: readonly NewContentField[];

  abstract create(values: NewContentValues, projectPath: string, context: NewContentContext): Promise<CreateContentResult | void>;
  abstract handle(contentAction: ContentAction, projectPath: string): void | ContentStrategyResult | Promise<void | ContentStrategyResult | undefined>;
  abstract validate(values: NewContentValues, siblingNames: readonly string[]): Promise<NewContentValidation>;

  readonly #contentType: AssetType;
  constructor(contentType: AssetType) {
    this.#contentType = contentType;
  }

  get contentType() {
    return this.#contentType;
  }

  protected async deleteContent(id: number, projectPath: string, data?: unknown) {
    const ids = Array.isArray(data) && data.every((item) => typeof item === 'number') ? data : [id];
    if (!projectPath || !window.manticore?.deleteProjectContent) {
      notifyUnavailableDesktopApi();
      return new ContentAction(id, 'delete-completed', { error: NotificationError.DeleteContent });
    }

    try {
      return new ContentAction(id, 'delete-completed', { deletedIds: await window.manticore.deleteProjectContent(projectPath, ids) });
    } catch {
      return new ContentAction(id, 'delete-completed', { error: NotificationError.DeleteContent });
    }
  }

}
