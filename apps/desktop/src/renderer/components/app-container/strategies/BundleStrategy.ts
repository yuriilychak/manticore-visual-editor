import { AssetType } from '../../../../types';

import { ContentAction, ImportAssets, type ImportAssetResult, NewContentValidation, OpenImportAssets, OpenNewContent } from '../common';
import { NotificationError } from '../constants';
import type { NewContentField, NewContentValues } from '../types';
import { ProjectProxy } from '../ProjectProxy';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult, notifyUnavailableDesktopApi } from './helpers';

export class BundleStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor(projectProxy: ProjectProxy) {
    super(projectProxy, AssetType.Bundle);
  }

  async create({ name = '' }: NewContentValues) {
    const project = this.projectProxy.project;
    if (!project || !window.manticore?.createProjectBundle) return notifyUnavailableDesktopApi();

    this.projectProxy.addBundle(
      await window.manticore.createProjectBundle(project.path, this.getField('parentPath', ''), name.trim())
    );
  }

  async handle({ action, data, id }: ContentAction) {
    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.BundleFolder, { parentId: id }));
      case 'add-atlas':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.TextureAtlas, { parentId: id }));
      case 'import':
        return new ContentAction(id, 'open-import-assets', new OpenImportAssets(id));
      case 'import-asset':
        return new ContentAction(id, 'import-assets-completed', await this.importAssets(id, data));
      default:
        break;
    }

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
        } catch {
          return createErrorResult(id, NotificationError.RenameBundle);
        }
        return;
      }
      case 'move': {
        if (!window.manticore?.moveProjectBundle) return notifyUnavailableDesktopApi();

        try {
          this.projectProxy.moveBundle(id, await window.manticore.moveProjectBundle(project.path, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveBundle);
        }
        return;
      }
      default:
        return;
    }
  }

  private async importAssets(bundleId: number, data: unknown): Promise<ImportAssetResult[]> {
    if (!(data instanceof ImportAssets)) return [];

    const project = this.projectProxy.project;
    if (!project || !window.manticore?.importAssets) {
      notifyUnavailableDesktopApi();
      return data.assets.map(({ filePath }) => ({ asset: null, error: 'Desktop API is unavailable.', filePath }));
    }

    const jobId = crypto.randomUUID();
    let current = 0;
    const total = data.assets.length;
    const removeProgressListener = window.manticore.onImportAssetsProgress?.((progressJobId, result) => {
      if (progressJobId !== jobId) return;

      void result;
      data.onProgress(Math.min(++current, total), total);
    });
    try {
      const results = await window.manticore.importAssets(project.path, bundleId, [...data.assets], jobId);
      results.forEach(({ asset }) => {
        if (asset) this.projectProxy.addContent(asset);
      });
      return results;
    } catch (error) {
      return data.assets.map(({ filePath }) => ({
        asset: null,
        error: error instanceof Error ? error.message : 'Import failed.',
        filePath
      }));
    } finally {
      removeProgressListener?.();
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
