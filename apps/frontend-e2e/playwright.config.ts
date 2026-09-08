import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export const WEB_PORT = 4200;
export const API_PORT = 3000;
export const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
export const API_URL = `http://127.0.0.1:${API_PORT}`;

/**
 * Only the Angular dev server is a Playwright `webServer` — it needs nothing
 * from the backend to become ready. `global-setup` owns the rest: it starts
 * an in-memory Mongo on a random free port, boots the built NestJS backend
 * against it (the backend blocks on its Mongo connection at startup, so it
 * can't be a `webServer` that Playwright waits on *before* `global-setup`
 * runs), waits for `/health/ready`, and seeds the shared accounts. It
 * refuses to run if something is already serving the API port.
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
    // Bind explicitly to 127.0.0.1: the dev server defaults to `localhost`,
    // which on the CI runner resolves to ::1 (IPv6) while Playwright polls the
    // IPv4 `BASE_URL` — the server comes up but the readiness probe never
    // connects, so the job just sits there until the timeout.
    command: 'npx nx run frontend:serve --host=127.0.0.1',
    url: BASE_URL,
    // CI runs the dev server with every cache disabled, so the first cold
    // Vite prebundle + compile can take a few minutes on a shared runner.
    timeout: isCI ? 300_000 : 180_000,
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
