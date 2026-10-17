import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import { ProjectProxy } from '../ProjectProxy';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class ProjectFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.ProjectFolder);
  }

  async create({ name = '' }: NewContentValues) {
    if (!this.projectProxy.hasProject() || !window.manticore?.createProjectFolder) return notifyUnavailableDesktopApi();

    const project = this.projectProxy.project!;
    this.projectProxy.addContent(await window.manticore.createProjectFolder(project.path, this.getField('parentId', ProjectItemId.Project), name.trim()));
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
          this.projectProxy.moveContent(id, await window.manticore.moveProjectFolder(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveFolder);
        }
        return;
      }
      case 'rename': {
        if (typeof data !== 'string') return;
        if (!projectPath || !window.manticore?.renameProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameBundle(id, await window.manticore.renameProjectFolder(projectPath, id, data));
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
    const hasDuplicateName = this.getNamesAtParentId(this.getField('parentId', ProjectItemId.Project)).includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
