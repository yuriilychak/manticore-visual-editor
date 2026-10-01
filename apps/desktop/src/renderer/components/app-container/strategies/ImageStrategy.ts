import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation } from '../common';
import { NotificationError } from '../constants';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class ImageStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.Image);
  }

  create(_values: NewContentValues): Promise<void> {
    return Promise.resolve();
  }

  async handle({ action, data, id }: ContentAction) {
    if (action === 'delete') return this.deleteContent(id);
    if (action !== 'move' || typeof data !== 'number') return;

    const project = this.projectProxy.project;
    if (!project || !window.manticore?.moveProjectContent) return notifyUnavailableDesktopApi();

    try {
      this.projectProxy.moveContent(id, await window.manticore.moveProjectContent(project.path, id, data));
    } catch {
      return createErrorResult(id, NotificationError.MoveBundle);
    }
  }

  validate(_values: NewContentValues): Promise<NewContentValidation> {
    return Promise.resolve(new NewContentValidation());
  }
}
