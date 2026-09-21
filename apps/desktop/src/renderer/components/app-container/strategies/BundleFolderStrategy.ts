import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { notifyUnavailableDesktopApi } from './helpers';

export class BundleFolderStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];
  #parentId = 0;

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.BundleFolder);
  }

  setParentId(parentId: number) {
    this.#parentId = parentId;
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectBundleFolder) return notifyUnavailableDesktopApi();

    this.projectProxy.addContent(await window.manticore.createProjectBundleFolder(project.path, this.#parentId, name.trim()));
  }

  async handle(action: string, id: number) {
    switch (action) {
      case 'add-folder':
        return { action: 'open-new-content', assetType: AssetType.BundleFolder, parentId: id } as const;
      case 'add-atlas':
        return { action: 'open-new-content', assetType: AssetType.TextureAtlas, parentId: id } as const;
      default:
        return;
    }
  }

  async validate({ name = '' }: NewContentValues): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = this.getNamesAtParentId(this.#parentId).includes(trimmedName);

    return {
      fieldKey: hasDuplicateName ? 'name' : '',
      isValid: Boolean(trimmedName) && !hasDuplicateName,
      reason: hasDuplicateName ? 'alreadyExists' : ''
    };
  }
}
