import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class ProjectFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor() {
    super(AssetType.ProjectFolder);
  }

  async create({ name = '' }: NewContentValues, projectPath: string) {
    if (!projectPath || !window.manticore?.createProjectFolder) return notifyUnavailableDesktopApi();

    const content = await window.manticore.createProjectFolder(projectPath, this.getField('parentId', ProjectItemId.Project), name.trim());
    return new ContentAction(content.id, 'content-created', content);
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);

    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.ProjectFolder, { parentId: id }));
      case 'add-bundle':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.Bundle, { parentId: id }));
      case 'move': {
        if (typeof data !== 'number') return;
        if (!projectPath || !window.manticore?.moveProjectFolder) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.moveProjectFolder(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveFolder);
        }
        return;
      }
      case 'rename': {
        if (typeof data !== 'string') return;
        if (!projectPath || !window.manticore?.renameProjectFolder) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.renameProjectFolder(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameFolder);
        }
        return;
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
