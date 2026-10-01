// @ts-check
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['assets/vendor/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'components/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Build DOM with h() or textContent.' },
        { property: 'outerHTML', message: 'Build DOM with h() or textContent.' },
        { property: 'insertAdjacentHTML', message: 'Build DOM with h() or textContent.' },
      ],
    },
  },
  {
    files: ['js/theme-init.js'],
    languageOptions: { sourceType: 'script' },
  },
  {
    files: ['js/pages/**/*.js', 'components/**/*.js', 'js/services/**/*.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use core/http.js (providers) or a service (UI).' },
      ],
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },
];
