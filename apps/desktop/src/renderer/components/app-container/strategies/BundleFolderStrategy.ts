import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class BundleFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor() {
    super(AssetType.BundleFolder);
  }

  async create({ name = '' }: NewContentValues, projectPath: string) {
    if (!projectPath || !window.manticore?.createProjectBundleFolder) return notifyUnavailableDesktopApi();

    const content = await window.manticore.createProjectBundleFolder(projectPath, this.getField('parentId', ProjectItemId.Project), name.trim());
    return new ContentAction(content.id, 'content-created', content);
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);

    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.BundleFolder, { parentId: id }));
      case 'add-atlas':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.TextureAtlas, { parentId: id }));
      default:
        break;
    }

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
        return;
      case 'rename':
        if (typeof data !== 'string') return;
        if (!window.manticore?.renameProjectBundleFolder) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.renameProjectBundleFolder(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameBundleFolder);
        }
        return;
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
