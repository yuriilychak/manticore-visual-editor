import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class ProjectFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];
  #parentPath = '';

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.ProjectFolder);
  }

  setParentPath(parentPath: string) {
    this.#parentPath = parentPath;
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectFolder) return notifyUnavailableDesktopApi();

    const folderPath = this.#parentPath ? `${this.#parentPath}/${name.trim()}` : name.trim();
    this.projectProxy.addFolder(await window.manticore.createProjectFolder(project.path, folderPath));
  }

  async handle(action: string, id: number, data?: unknown) {
    if (typeof data !== 'string') {
      return;
    }

    switch (action) {
      case 'add-folder':
        return { action: 'open-new-content', assetType: AssetType.ProjectFolder, parentPath: data } as const;
      case 'add-bundle':
        return { action: 'open-new-content', assetType: AssetType.Bundle, parentPath: data } as const;
      case 'move': {
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.moveProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveFolders(await window.manticore.moveProjectFolder(project.path, id, data));
        } catch (reason) {
          return createErrorResult(reason, 'Could not move the folder.');
        }
        return;
      }
      case 'rename': {
        const project = this.projectProxy.project;
        if (!project || !window.manticore?.renameProjectFolder) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameFolder(id, await window.manticore.renameProjectFolder(project.path, id, data));
        } catch (reason) {
          return createErrorResult(reason, 'Could not rename the folder.');
        }
        return;
      }
      default:
        return;
    }
  }

  async validate({ name = '' }: NewContentValues): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = this.getNamesAtProjectPath(this.#parentPath).includes(trimmedName);

    return {
      fieldKey: hasDuplicateName ? 'name' : '',
      isValid: Boolean(trimmedName) && !hasDuplicateName,
      reason: hasDuplicateName ? 'alreadyExists' : ''
    };
  }
}
