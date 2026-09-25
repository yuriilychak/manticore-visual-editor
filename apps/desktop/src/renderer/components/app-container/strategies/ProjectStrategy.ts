import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import type { NewContentField, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class ProjectStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.Project);
    this.fields = [{ key: 'name' }, { key: 'location', selectValue: this.#selectLocation }];
  }

  readonly #selectLocation = async () => {
    if (!window.manticore) {
      notifyUnavailableDesktopApi();
      return '';
    }

    return window.manticore.selectProjectLocation();
  };

  async create({ location = '', name = '' }: NewContentValues) {
    if (!window.manticore?.createProject) return notifyUnavailableDesktopApi();

    this.projectProxy.replaceProject(await window.manticore.createProject({ name: name.trim(), parentPath: location }));
  }

  async handle({ action, data, id }: ContentAction) {
    switch (action) {
      case 'add-folder':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.ProjectFolder, { parentPath: '' }));
      case 'add-bundle':
        return ContentAction.create(id, 'open-new-content', new OpenNewContent(AssetType.Bundle, { parentPath: '' }));
      case 'rename':
        if (typeof data !== 'string') return;

        {
          const project = this.projectProxy.project;
          if (!project || !window.manticore?.renameProject) return notifyUnavailableDesktopApi();

          try {
            this.projectProxy.renameProject(await window.manticore.renameProject(project.path, data));
          } catch {
            return createErrorResult(id, NotificationError.RenameProject);
          }
          return;
        }
      default:
        return;
    }
  }

  async validate({ location = '', name = '' }: NewContentValues): Promise<NewContentValidation> {
    if (!name.trim() || !location) return new NewContentValidation();

    if (!window.manticore?.canCreateProject) return new NewContentValidation('', false, 'invalid-name');

    const validation = await window.manticore.canCreateProject({ name: name.trim(), parentPath: location });
    return new NewContentValidation('', validation.isAvailable, validation.reason ?? '');
  }
}
