import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation } from '../common';
import { NotificationError } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentField } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class ImageStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [];

  constructor() {
    super(AssetType.Image);
  }

  create(): Promise<void> {
    return Promise.resolve();
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);
    if (action !== 'move' || typeof data !== 'number') return;

    if (!projectPath || !window.manticore?.moveProjectContent) return notifyUnavailableDesktopApi();

    try {
      return new ContentAction(id, 'content-updated', await window.manticore.moveProjectContent(projectPath, id, data));
    } catch {
      return createErrorResult(id, NotificationError.MoveBundle);
    }
  }

  validate(): Promise<NewContentValidation> {
    return Promise.resolve(new NewContentValidation());
  }
}
