import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
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

  async handle(action: string, _id: number, data?: unknown) {
    switch (action) {
      case 'add-folder':
        return { action: 'open-new-content', assetType: AssetType.ProjectFolder, parentPath: '' } as const;
      case 'add-bundle':
        return { action: 'open-new-content', assetType: AssetType.Bundle, parentPath: '' } as const;
      case 'rename':
        if (typeof data !== 'string') return;

        {
          const project = this.projectProxy.project;
          if (!project || !window.manticore?.renameProject) return notifyUnavailableDesktopApi();

          try {
            this.projectProxy.renameProject(await window.manticore.renameProject(project.path, data));
          } catch (reason) {
            return createErrorResult(reason, 'Could not rename the project.');
          }
          return;
        }
      default:
        return;
    }
  }

  async validate({ location = '', name = '' }: NewContentValues): Promise<NewContentValidation> {
    if (!name.trim() || !location) return { fieldKey: '', isValid: false, reason: '' };

    if (!window.manticore?.canCreateProject) return { fieldKey: '', isValid: false, reason: 'invalid-name' };

    const validation = await window.manticore.canCreateProject({ name: name.trim(), parentPath: location });
    return { fieldKey: '', isValid: validation.isAvailable, reason: validation.reason ?? '' };
  }
}
