import nx from '@nx/eslint-plugin';

// Angular Material is an implementation detail of the UI layer, not a
// public dependency of feature code. Route it through `@org/frontend-ui`
// (presentational kit), `@org/frontend-feedback` (dialogs / toasts) and
// `@org/frontend-design` (theme + providers) so any single widget can be
// restyled or replaced in one place instead of across every feature.
//
// This descriptor is `warn` workspace-wide (below); the three wrapper libs
// + the dashboard shell re-enable the import in their own
// `eslint.config.mjs` (`no-restricted-imports: off`), and the app shell
// hardens it to `error` (it carries no Material import today).
export const noDirectMaterial = {
  paths: [
    {
      name: '@angular/material',
      message:
        'Import Material through @org/frontend-ui / @org/frontend-feedback / @org/frontend-design instead.',
    },
  ],
  patterns: [
    {
      group: ['@angular/material/*'],
      message:
        'Import Material through @org/frontend-ui / @org/frontend-feedback / @org/frontend-design instead.',
    },
  ],
};

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
          // `frontend-dashboard` / `frontend-design` are deliberately both:
          // a small DI provider (`provideDashboard` / `materialProviders`)
          // is eager, while the shell UI and the theme dialog are lazily
          // loaded via deep entry points (`@org/frontend-dashboard/shell`,
          // `@org/frontend-design/theme-panel`, …). Don't treat those
          // dynamic imports as making the whole project lazy.
          checkDynamicDependenciesExceptions: [
            '@org/frontend-dashboard',
            '@org/frontend-dashboard/*',
            '@org/frontend-design',
            '@org/frontend-design/*',
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
    // `**/*.ts` (not `libs/**` / `apps/**`): flat-config globs are relative
    // to the directory ESLint runs from, and `nx lint` runs it from each
    // project's own root, so a workspace-relative prefix matches nothing
    // there. The top-level `ignores` block already excludes dist / out-tsc
    // / jest configs.
    files: ['**/*.ts'],
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
    // `**/*.ts` so `nx lint` (which runs ESLint from each project root)
    // actually applies these — a `libs/**` / `apps/**` prefix silently
    // matched nothing there.
    files: ['**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/test-setup.ts',
      '**/*.stories.ts',
    ],
    rules: {
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'max-nested-callbacks': ['warn', 4],
    },
  },
  {
    // Route `@angular/material/*` through the frontend-ui / -feedback /
    // -design wrappers. `warn` by default (editor signal, non-blocking,
    // like the size guardrails above); the wrapper libs switch it off and
    // the app shell hardens it to `error` in their own configs. Backend
    // code never imports Material, so the global glob is inert there.
    // `**/`-anchored so it also applies under `nx lint` (which runs eslint
    // from each project's directory, not the workspace root).
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.e2e.spec.ts', '**/*-spec.ts'],
    rules: {
      'no-restricted-imports': ['warn', noDirectMaterial],
    },
  },
  {
    // Test code: `any` casts and non-null assertions are how you build
    // test doubles and read loosely-typed fixtures — not a smell here.
    files: [
      '**/*.spec.ts',
      '**/*.e2e.spec.ts',
      '**/*-spec.ts',
      '**/test-setup.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
