import { AssetType } from '../../../../types';

import { ContentAction, type ImportAssetResult, ImportAssets, NewContentValidation, OpenImportAssets, OpenNewContent } from '../common';
import { NotificationError, ProjectItemId } from '../constants';
import { notifyUnavailableDesktopApi } from '../helpers';
import type { NewContentField, NewContentValues } from '../types';

import { ContentStrategyBase } from './ContentStrategyBase';
import { createErrorResult } from './helpers';

export class BundleStrategy extends ContentStrategyBase {
  readonly fields: readonly NewContentField[] = [{ key: 'name' }];

  constructor() {
    super(AssetType.Bundle);
  }

  async create({ name = '' }: NewContentValues, projectPath: string) {
    if (!projectPath || !window.manticore?.createProjectBundle) return notifyUnavailableDesktopApi();

    const content = await window.manticore.createProjectBundle(projectPath, this.getField('parentId', ProjectItemId.Project), name.trim());
    return new ContentAction(content.id, 'content-created', content);
  }

  async handle({ action, data, id }: ContentAction, projectPath: string) {
    if (action === 'delete') return this.deleteContent(id, projectPath, data);

    switch (action) {
      case 'add-folder':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.BundleFolder, { parentId: id }));
      case 'add-atlas':
        return new ContentAction(id, 'open-new-content', new OpenNewContent(AssetType.TextureAtlas, { parentId: id }));
      case 'import':
        return new ContentAction(id, 'open-import-assets', new OpenImportAssets(id));
      case 'import-asset':
        return new ContentAction(id, 'import-assets-completed', await this.importAssets(id, projectPath, data));
      default:
        break;
    }

    if (!projectPath) {
      return notifyUnavailableDesktopApi();
    }

    switch (action) {
      case 'rename': {
        if (typeof data !== 'string') return;
        if (!window.manticore?.renameProjectBundle) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.renameProjectBundle(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.RenameBundle);
        }
      }
      case 'move': {
        if (typeof data !== 'number') return;
        if (!window.manticore?.moveProjectBundle) return notifyUnavailableDesktopApi();

        try {
          return new ContentAction(id, 'content-updated', await window.manticore.moveProjectBundle(projectPath, id, data));
        } catch {
          return createErrorResult(id, NotificationError.MoveBundle);
        }
      }
      default:
        return;
    }
  }

  private async importAssets(bundleId: number, projectPath: string, data: unknown): Promise<ImportAssetResult[]> {
    if (!(data instanceof ImportAssets)) return [];

    if (!projectPath || !window.manticore?.importAssets) {
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
      return window.manticore.importAssets(projectPath, bundleId, [...data.assets], jobId);
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

  async validate({ name = '' }: NewContentValues, siblingNames: readonly string[]): Promise<NewContentValidation> {
    const trimmedName = name.trim();
    const hasDuplicateName = siblingNames.includes(trimmedName);

    return new NewContentValidation(
      hasDuplicateName ? 'name' : '',
      Boolean(trimmedName) && !hasDuplicateName,
      hasDuplicateName ? 'alreadyExists' : ''
    );
  }
}
