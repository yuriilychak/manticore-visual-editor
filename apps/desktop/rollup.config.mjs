import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'node:module';

const external = ['electron', ...builtinModules, ...builtinModules.map((name) => `node:${name}`)];

export default {
  input: {
    main: 'src/main.ts',
    preload: 'src/preload.ts'
  },
  external,
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: '[name].cjs',
    sourcemap: true
  },
  plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), typescript({ noEmit: false, outDir: 'dist' })]
};

