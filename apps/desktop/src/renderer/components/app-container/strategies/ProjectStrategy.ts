import { AssetType } from '../../../../types';

import { ContentAction, NewContentValidation, OpenImportAssets, OpenNewContent } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class ProjectStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[];

  constructor() {
    super(AssetType.Project);
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

    return new ContentAction(ProjectItemId.Project, 'project-created', await window.manticore.createProject({ name: name.trim(), parentPath: location }));
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.ProjectFolder, { parentId: ProjectItemId.RootFolder }));
      case 'add-bundle':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.Bundle, { parentId: ProjectItemId.RootFolder }));
      case 'import':
        return new ContentAction(id, 'open-import-assets', new OpenImportAssets());
      case 'rename':
        if (typeof data !== 'string') return;

        {
          if (!projectPath || !window.manticore?.renameProject) return notifyUnavailableDesktopApi();

          try {
            return new ContentAction(id, 'project-renamed', await window.manticore.renameProject(projectPath, data));
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
