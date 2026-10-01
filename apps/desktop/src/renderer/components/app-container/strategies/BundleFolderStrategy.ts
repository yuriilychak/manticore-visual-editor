import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class BundleFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.BundleFolder);
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectBundleFolder) return notifyUnavailableDesktopApi();

    this.projectProxy.addContent(await window.manticore.createProjectBundleFolder(project.path, this.getField('parentId', 0), name.trim()));
  }

  async handle({ action, data, id }: ContentAction) {
    if (action === 'delete') return this.deleteContent(id);

    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.BundleFolder, { parentId: id }));
      case 'add-atlas':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.TextureAtlas, { parentId: id }));
      default:
        break;
    }

    const project = this.projectProxy.project;
    if (!project) return notifyUnavailableDesktopApi();

    switch (action) {
      case 'move':
        if (typeof data !== 'number') return;
        if (!window.manticore?.moveProjectContent) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveContent(id, await window.manticore.moveProjectContent(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveBundle);
        }
        return;
      case 'rename':
        if (typeof data !== 'string') return;
        if (!window.manticore?.renameProjectBundleFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameBundle(id, await window.manticore.renameProjectBundleFolder(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameBundleFolder);
        }
        return;
      default:
        return;
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
