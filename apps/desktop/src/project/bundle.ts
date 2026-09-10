import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BundleConfig } from './types';
import { formatBundleDirectoryName } from './utils';

const INITIAL_BUNDLE_VERSION = 0;

export async function createBundle(sourcePath: string, id: number, name: string): Promise<string> {
  const directoryName = formatBundleDirectoryName(id);
  const bundlePath = path.join(sourcePath, directoryName);
  const config: BundleConfig = { id: id.toString(), name, version: INITIAL_BUNDLE_VERSION };
  await mkdir(bundlePath);
  await writeFile(path.join(bundlePath, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return directoryName;
}
