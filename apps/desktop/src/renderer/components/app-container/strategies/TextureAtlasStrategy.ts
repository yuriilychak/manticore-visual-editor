import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class TextureAtlasStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.TextureAtlas);
  }

  async create({ name = '' }: NewContentValues) {
    if (!this.projectProxy.hasProject() || !window.manticore?.createProjectTextureAtlas) return notifyUnavailableDesktopApi();

    const project = this.projectProxy.project!;
    this.projectProxy.addContent(await window.manticore.createProjectTextureAtlas(project.path, this.getField('parentId', ProjectItemId.Project), name.trim()));
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);

    if (!projectPath) return notifyUnavailableDesktopApi();
    switch (action) {
      case 'move':
        if (typeof data !== 'number') return;
        if (!window.manticore?.moveProjectContent) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveContent(id, await window.manticore.moveProjectContent(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveBundle);
        }
        return;
      case 'rename':
        if (typeof data !== 'string') return;
        if (!window.manticore?.renameProjectTextureAtlas) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameBundle(id, await window.manticore.renameProjectTextureAtlas(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameTextureAtlas);
        }
        return;
      default:
        return;
    }
  }

  async validate({ name = '' }: NewContentValues): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = this.getNamesAtParentId(this.getField('parentId', ProjectItemId.Project)).includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
