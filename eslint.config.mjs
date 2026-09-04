import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    // Build output + tooling configs — not hand-written source, don't lint.
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/jest.config.{js,cjs,mjs,ts,cts,mts}',
      '**/jest.preset.js',
      '**/webpack.config.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // `frontend-dashboard` is deliberately both: `provideDashboard`
          // (a small DI provider) is eager, the shell UI is lazily routed
          // via `@org/frontend-dashboard/shell` etc. Don't treat the deep
          // dynamic imports as making the whole project lazy.
          checkDynamicDependenciesExceptions: [
            '@org/frontend-dashboard',
            '@org/frontend-dashboard/*',
          ],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:backend',
              onlyDependOnLibsWithTags: ['scope:backend', 'scope:shared'],
            },
            {
              sourceTag: 'scope:frontend',
              onlyDependOnLibsWithTags: ['scope:frontend', 'scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    // Type-aware linting. `projectService` lets typescript-eslint resolve
    // each file's tsconfig on demand — no `project` glob to maintain.
    files: ['libs/**/*.ts', 'apps/**/*.ts', 'tools/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // A dropped Promise is almost always a bug — force an explicit
      // `await` or `void` (the fire-and-forget marker used by the audit
      // log, mailer, etc.).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
    },
  },
  {
    // Size / shape guardrails for hand-written source. `max-lines` is an
    // error — the ratchet that stopped `profile-page.ts` growing back to
    // 1000+ lines; the rest are warnings (editor signal, non-blocking).
    files: ['libs/**/*.ts', 'apps/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/test-setup.ts',
      '**/*.stories.ts',
      'tools/**',
    ],
    rules: {
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'max-nested-callbacks': ['warn', 4],
    },
  },
  {
    // Test code: `any` casts and non-null assertions are how you build
    // test doubles and read loosely-typed fixtures — not a smell here.
    files: ['**/*.spec.ts', '**/*.e2e.spec.ts', '**/*-spec.ts', '**/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
