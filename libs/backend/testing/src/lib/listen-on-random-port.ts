import { INestApplication } from '@nestjs/common';

/**
 * Starts a Nest app on an OS-assigned free port (`:0`) and returns its
 * `http://127.0.0.1:<port>` base URL, for E2E tests that talk to the app
 * over real `fetch()` calls. Works with an app from either
 * `NestFactory.create(...)` or `moduleRef.createNestApplication()`.
 */
export async function listenOnRandomPort(
  app: INestApplication,
): Promise<string> {
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return `http://127.0.0.1:${port}`;
}
