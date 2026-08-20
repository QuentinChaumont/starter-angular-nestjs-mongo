import { INestApplication } from '@nestjs/common';

/**
 * Internal to backend-core's own specs — see build-test-config.ts for why
 * this isn't imported from `@org/backend-testing` instead (circular).
 */
export async function listenOnRandomPort(
  app: INestApplication,
): Promise<string> {
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return `http://127.0.0.1:${port}`;
}
