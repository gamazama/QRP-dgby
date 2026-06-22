import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'public/packs', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Node scripts (offline pipeline, capture utilities) run under Node globals.
  {
    files: ['**/*.{js,mjs,cjs}', 'scripts/**/*'],
    languageOptions: { globals: globals.node },
  },
  // The render engine and the offline pipeline must stay framework-agnostic.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'engine/ must stay React-free.' },
            { name: 'react-dom', message: 'engine/ must stay React-free.' },
          ],
          patterns: ['@/render/*', '@/features/*', '@/store/*', '@/data/*', '@/pages/*'],
        },
      ],
    },
  },
);
