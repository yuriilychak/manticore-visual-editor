import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTERNAL = ['electron', ...builtinModules, ...builtinModules.map((name) => `node:${name}`)];
const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default {
  input: {
    main: 'src/main.ts',
    preload: 'src/preload.ts'
  },
  external: EXTERNAL,
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: '[name].cjs',
    sourcemap: true
  },
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    typescript({
      // Resolve patterns from the workspace root: project sources are outside
      // the desktop package and can also be reached through its workspace link.
      filterRoot: WORKSPACE_ROOT,
      include: ['apps/desktop/src/main.ts', 'apps/desktop/src/preload.ts', 'packages/project/src/**/*.ts'],
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      baseUrl: WORKSPACE_ROOT,
      paths: {
        '@manticore/project': ['packages/project/src/index.ts'],
        '@manticore/project/*': ['packages/project/src/*']
      },
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      tsconfig: false
    })
  ]
};
