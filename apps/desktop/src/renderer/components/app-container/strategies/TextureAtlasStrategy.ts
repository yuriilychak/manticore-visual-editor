import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentContext, NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class TextureAtlasStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor() {
    super(AssetType.TextureAtlas);
  }

  async create({ name = '' }: NewContentValues, projectPath: string, { parentId = ProjectItemId.Project }: NewContentContext) {
    if (!projectPath || !window.manticore?.createProjectTextureAtlas) return notifyUnavailableDesktopApi();

    const content = await window.manticore.createProjectTextureAtlas(projectPath, typeof parentId === 'number' ? parentId : ProjectItemId.Project, name.trim());
    return new ContentAction(content.id, 'content-created', content);
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);

    if (!projectPath) return notifyUnavailableDesktopApi();
    switch (action) {
      case 'move':
        if (typeof data !== 'number') return;
        if (!window.manticore?.moveProjectContent) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.moveProjectContent(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveBundle);
        }
      case 'rename':
        if (typeof data !== 'string') return;
        if (!window.manticore?.renameProjectTextureAtlas) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.renameProjectTextureAtlas(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameTextureAtlas);
        }
      default:
        return;
    }
  }

  async validate({ name = '' }: NewContentValues, siblingNames: readonly string[]): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = siblingNames.includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
