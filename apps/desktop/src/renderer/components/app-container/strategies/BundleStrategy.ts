import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class BundleStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];
  #parentPath = '';

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.Bundle);
  }

  setParentPath(parentPath: string) {
    this.#parentPath = parentPath;
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectBundle) return notifyUnavailableDesktopApi();

      this.projectProxy.addBundle(
        await window.manticore.createProjectBundle(project.path, this.#parentPath, name.trim())
    );
  }

  async handle(action: string, id: number, data?: unknown) {
    if (typeof data !== 'string') return;

    const project = this.projectProxy.project;
    if (!project) {
      return notifyUnavailableDesktopApi();
    }

    switch (action) {
      case 'rename': {
        if (!window.manticore?.renameProjectBundle) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.renameBundle(id, await window.manticore.renameProjectBundle(project.path, id, data));
        } catch (reason) {
          return createErrorResult(reason, 'Could not rename the bundle.');
        }
        return;
      }
      case 'move': {
        if (!window.manticore?.moveProjectBundle) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveBundle(id, await window.manticore.moveProjectBundle(project.path, id, data));
        } catch (reason) {
          return createErrorResult(reason, 'Could not move the bundle.');
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
