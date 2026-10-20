import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'server/all_menu_images/**',
      'client/public/**',
      'admin-app/public/**',
      'apps/*/public/**',
      '**/public/**',
      'scratch/**',
      'scripts/**',
    ],
  },
  {
    files: ['server/**/*.js', 'apps/**/*.{js,jsx}', 'packages/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'valid-typeof': 'error',
    },
  },
];
