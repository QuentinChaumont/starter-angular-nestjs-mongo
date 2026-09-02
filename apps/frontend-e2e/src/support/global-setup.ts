import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { API_PORT, API_URL, BASE_URL } from '../../playwright.config';
import { SEEDED_ADMIN, SEEDED_USER, apiRegister, promoteToAdmin } from './seed';

const WORKSPACE_ROOT = resolve(__dirname, '../../../..');
const BACKEND_ENTRY = resolve(WORKSPACE_ROOT, 'apps/backend/dist/main.js');

async function isUp(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function waitForReady(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = 'no response';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`timed out waiting for ${url} (${String(lastError)})`);
}

/**
 * The backend can't be a Playwright `webServer`: it blocks on its Mongo
 * connection at startup, and Playwright waits for every `webServer` to be
 * ready *before* running this file — so Mongo has to come up here, then the
 * backend (spawned against that Mongo), then the seed.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  // A dev backend left running on the API port would answer the readiness
  // probe and the whole suite would silently run against the wrong
  // database — fail loudly instead.
  if (await isUp(`${API_URL}/api/health/live`)) {
    throw new Error(
      `Something is already serving ${API_URL} — stop your dev backend ` +
        `("nx serve @org/backend") before running the e2e suite.`,
    );
  }

  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'e2e' } });
  const mongoUri = mongo.getUri('e2e');

  if (!existsSync(BACKEND_ENTRY)) {
    // `nx run frontend-e2e:e2e` builds it via `dependsOn`; this covers a
    // bare `playwright test` invocation.
    execFileSync('npx', ['nx', 'build', '@org/backend'], {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
    });
  }

  const backend = spawn(process.execPath, [BACKEND_ENTRY], {
    cwd: WORKSPACE_ROOT,
    detached: true,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(API_PORT),
      MONGO_URI: mongoUri,
      JWT_SECRET: 'e2e-only-not-a-secret',
      CORS_ORIGINS: BASE_URL,
      AUTH_COOKIE_SECURE: 'false',
      AUTH_RATE_LIMIT_LIMIT: '100000',
      RATE_LIMIT_LIMIT: '100000',
    },
  });

  const stopBackend = () =>
    new Promise<void>((resolveStop) => {
      if (backend.exitCode !== null || backend.signalCode !== null) {
        return resolveStop();
      }
      backend.once('exit', () => resolveStop());
      try {
        process.kill(-(backend.pid as number), 'SIGTERM');
      } catch {
        return resolveStop();
      }
      setTimeout(() => {
        try {
          process.kill(-(backend.pid as number), 'SIGKILL');
        } catch {
          /* already gone */
        }
        resolveStop();
      }, 5_000).unref();
    });

  try {
    await waitForReady(`${API_URL}/api/health/ready`);
    await apiRegister(SEEDED_USER);
    await apiRegister(SEEDED_ADMIN);
    await promoteToAdmin(mongoUri, SEEDED_ADMIN.email);
  } catch (error) {
    await stopBackend();
    await mongo.stop();
    throw error;
  }

  return async () => {
    await stopBackend();
    await mongo.stop();
  };
}
