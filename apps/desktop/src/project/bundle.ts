import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BundleConfig } from '../types';

import { INITIAL_BUNDLE_VERSION } from './constants';
import { isFolderConfig } from './folder';
import { formatBundleDirectoryName } from './utils';

function isBundleConfig(value: unknown): value is BundleConfig {
  if (typeof value !== 'object' || value === null) return false;

  const { folders, id, name, version } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    Boolean(id) &&
    typeof name === 'string' &&
    typeof version === 'number' &&
    (folders === undefined || (Array.isArray(folders) && folders.every(isFolderConfig)))
  );
}

export async function createBundle(sourcePath: string, id: number, name: string): Promise<string> {
  const directoryName = formatBundleDirectoryName(id);
  const bundlePath = path.join(sourcePath, directoryName);
  const config: BundleConfig = { id: id.toString(), name, version: INITIAL_BUNDLE_VERSION };
  await mkdir(bundlePath);
  await writeFile(path.join(bundlePath, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return directoryName;
}

export async function getProjectBundle(bundlePath: string): Promise<BundleConfig> {
  const config = JSON.parse(await readFile(path.join(bundlePath, 'config.json'), 'utf8')) as unknown;
  if (!isBundleConfig(config)) throw new Error('Bundle configuration is invalid.');

  return config;
}
