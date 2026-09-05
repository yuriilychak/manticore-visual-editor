import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const IMPORT_GROUPS = [
  ['^(?!@mui/|\\.)@?\\w'],
  ['^@mui/'],
  ['^\\.\\./\\.\\./\\.\\./'],
  ['^\\.\\./\\.\\./'],
  ['^\\.\\./'],
  ['^\\./']
];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/desktop/**/*.{ts,tsx,mjs}'],
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': ['error', { groups: IMPORT_GROUPS }]
    }
  },
  {
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: globals.browser
    },
    plugins: {
      ...reactPlugin.configs.flat.recommended.plugins,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    files: ['apps/desktop/src/renderer/src.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  prettier
);
