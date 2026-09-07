import nx from '@nx/eslint-plugin';
import baseConfig, { noDirectMaterial } from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    // The app shell wires Material only through the frontend-* bricks and
    // carries no direct `@angular/material` import — hard-fail if one
    // creeps in (the workspace default is a warning).
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: { 'no-restricted-imports': ['error', noDirectMaterial] },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
