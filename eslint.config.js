import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig(
  [globalIgnores([
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '.yarn/**',
    '.cache/**',
    'examples/browser/**',
    'examples/node/**',
    'tests/package/**',
  ])],
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },
  prettierConfig,
);