import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import type { NewContentField, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

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

    const parentPath = this.getField('parentPath', '');
    const folderPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
    this.projectProxy.addFolder(await window.manticore.createProjectFolder(project.path, folderPath));
  }

  async handle({ action, data, id }: ContentAction) {
    if (typeof data !== 'string') {
      return;
    }

    switch (action) {
      case 'add-folder':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.ProjectFolder, { parentPath: data }));
      case 'add-bundle':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.Bundle, { parentPath: data }));
      case 'move': {
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.moveProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveFolders(await window.manticore.moveProjectFolder(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveFolder);
        }
        return;
      }
      case 'rename': {
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.renameProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameFolder(id, await window.manticore.renameProjectFolder(project.path, id, data));
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
    const hasDuplicateName = this.getNamesAtProjectPath(this.getField('parentPath', '')).includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
