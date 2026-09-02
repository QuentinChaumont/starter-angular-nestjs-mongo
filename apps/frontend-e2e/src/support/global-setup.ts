import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  API_PORT,
  API_URL,
  BASE_URL,
  MONGO_PORT,
  MONGO_URI,
} from '../../playwright.config';
import { SEEDED_USER, apiRegister } from './seed';

const WORKSPACE_ROOT = resolve(__dirname, '../../../..');
const BACKEND_ENTRY = resolve(WORKSPACE_ROOT, 'apps/backend/dist/main.js');

async function waitForReady(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
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
 * backend, then the seed.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const mongo = await MongoMemoryServer.create({
    instance: { port: MONGO_PORT, dbName: 'e2e' },
  });

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
      MONGO_URI,
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
