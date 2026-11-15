import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

export default [
    // Main bundle
    {
        input: 'src/index.ts',
        output: {
            file: '../../lib/polygon-packer.js',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            resolve({
                extensions: ['.ts', '.js']
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                sourceMap: true,
                inlineSources: true
            }),
            terser({
                compress: {
                    passes: 2,
                    pure_getters: true,
                    unsafe: true,
                    unsafe_methods: true
                },
                mangle: {
                    properties: {
                        regex: /^#/,
                        reserved: ['__']  // Don't mangle dunder methods
                    },
                    toplevel: false
                },
                format: {
                    comments: false
                }
            })
        ]
    },
    // Worker bundle
    {
        input: 'src/nest.worker.ts',
        output: {
            file: '../../lib/polygon-packer.worker.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [
            resolve({
                extensions: ['.ts', '.js']
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                sourceMap: true,
                inlineSources: true
            }),
            terser({
                compress: {
                    passes: 2,
                    pure_getters: true,
                    unsafe: true,
                    unsafe_methods: true
                },
                mangle: {
                    properties: {
                        regex: /^#/,
                        reserved: ['__']  // Don't mangle dunder methods
                    },
                    toplevel: false
                },
                format: {
                    comments: false
                }
            })
        ]
    },
    {
        input: 'src/index.ts',
        output: { file: '../../lib/polygon-packer.d.ts', format: 'esm' },
        plugins: [dts()]
    }
];
