import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import type { NewContentField, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

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
    switch (action) {
      case 'add-folder':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.BundleFolder, { parentId: id }));
      case 'add-atlas':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.TextureAtlas, { parentId: id }));
      default:
        break;
    }

    if (action !== 'rename' || typeof data !== 'string') return;

    const project = this.projectProxy.project;
    if (!project || !window.manticore?.renameProjectBundleFolder) return notifyUnavailableDesktopApi();

    try {
      this.projectProxy.renameBundle(id, await window.manticore.renameProjectBundleFolder(project.path, id, data));
    } catch {
      return createErrorResult(id, NotificationError.RenameBundleFolder);
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
