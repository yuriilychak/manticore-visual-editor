import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class ProjectFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.ProjectFolder);
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectFolder) return notifyUnavailableDesktopApi();

    this.projectProxy.addContent(await window.manticore.createProjectFolder(project.path, this.getField('parentId', 0), name.trim()));
  }

  async handle({ action, data, id }: ContentAction) {
    if (action === 'delete') return this.deleteContent(id);

    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.ProjectFolder, { parentId: id }));
      case 'add-bundle':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.Bundle, { parentId: id }));
      case 'move': {
        if (typeof data !== 'number') return;
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.moveProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveContent(id, await window.manticore.moveProjectFolder(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveFolder);
        }
        return;
      }
      case 'rename': {
        if (typeof data !== 'string') return;
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.renameProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameBundle(id, await window.manticore.renameProjectFolder(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameFolder);
        }
        return;
      }
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
