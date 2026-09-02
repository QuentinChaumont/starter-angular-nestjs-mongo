import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export const WEB_PORT = 4200;
export const API_PORT = 3000;
export const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
export const API_URL = `http://127.0.0.1:${API_PORT}`;

/**
 * Fixed, deliberately non-default Mongo port for the in-memory server
 * `global-setup` starts — not 27017, so a developer's local `mongod` /
 * Compass can keep running during the suite.
 */
export const MONGO_PORT = 27077;
export const MONGO_URI = `mongodb://127.0.0.1:${MONGO_PORT}/e2e`;

/**
 * Only the Angular dev server is a Playwright `webServer` — it needs nothing
 * from the backend to become ready. `global-setup` owns the rest: it starts
 * an in-memory Mongo, boots the built NestJS backend against it (the backend
 * blocks on its Mongo connection at startup, so it can't be a `webServer`
 * that Playwright waits on *before* `global-setup` runs), waits for
 * `/health/ready`, and seeds the shared account.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  outputDir: 'test-results',
  globalSetup: './src/support/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx nx run frontend:serve',
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
