import { AssetType } from '../../../../types';

import type { NewContentField, NewContentValidation, NewContentValues } from '../new-content-dialog/types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class TextureAtlasStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];
  #parentId = 0;

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.TextureAtlas);
  }

  setParentId(parentId: number) {
    this.#parentId = parentId;
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectTextureAtlas) return notifyUnavailableDesktopApi();

    this.projectProxy.addContent(await window.manticore.createProjectTextureAtlas(project.path, this.#parentId, name.trim()));
  }

  async handle(action: string, id: number, data?: unknown) {
    if (action !== 'rename' || typeof data !== 'string') return;

    const project = this.projectProxy.project;
    if (!project || !window.manticore?.renameProjectTextureAtlas) return notifyUnavailableDesktopApi();

    try {
      this.projectProxy.renameBundle(id, await window.manticore.renameProjectTextureAtlas(project.path, id, data));
    } catch (reason) {
      return createErrorResult(reason, 'Could not rename the texture atlas.');
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
