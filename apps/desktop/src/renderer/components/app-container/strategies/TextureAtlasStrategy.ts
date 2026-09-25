import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation } from '../common';
import { NotificationError } from '../constants';
import type { NewContentField, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class TextureAtlasStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.TextureAtlas);
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectTextureAtlas) return notifyUnavailableDesktopApi();

    this.projectProxy.addContent(await window.manticore.createProjectTextureAtlas(project.path, this.getField('parentId', 0), name.trim()));
  }

  async handle({ action, data, id }: ContentAction) {
    if (action !== 'rename' || typeof data !== 'string') return;

    const project = this.projectProxy.project;
    if (!project || !window.manticore?.renameProjectTextureAtlas) return notifyUnavailableDesktopApi();

    try {
      this.projectProxy.renameBundle(id, await window.manticore.renameProjectTextureAtlas(project.path, id, data));
    } catch {
      return createErrorResult(id, NotificationError.RenameTextureAtlas);
    }
  }

  async validate({ name = '' }: NewContentValues): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = this.getNamesAtParentId(this.getField('parentId', 0)).includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
