import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '@org/backend-core';

export interface TestAuthenticatedUser {
  id: string;
  roles: string[];
}

/**
 * Signs a JWT with the same `{ sub, roles }` payload shape `JwtStrategy`
 * (in `@org/backend-auth`) expects, using the secret from `config.jwt` —
 * so a real running app with `JwtAuthGuard`/`RolesGuard` accepts it as
 * `Authorization: Bearer <token>`. Lets a feature module's E2E tests
 * exercise its own protected routes without going through a real
 * `/auth/login` round trip (and without depending on `@org/backend-auth`
 * or a Mongo-backed user just to get a token). `config` must have
 * `JWT_SECRET` set — e.g. `buildTestConfig({ JWT_SECRET: 'test-secret' })`.
 */
export async function signTestJwt(
  config: AppConfigService,
  user: TestAuthenticatedUser,
): Promise<string> {
  const { secret, expiresIn } = config.jwt;
  if (!secret) {
    throw new Error(
      'signTestJwt requires JWT_SECRET to be set on the given config.',
    );
  }

  const jwt = new JwtService({
    secret,
    ...(expiresIn
      ? { signOptions: { expiresIn: expiresIn as `${number}` } }
      : {}),
  });
  return jwt.signAsync({ sub: user.id, roles: user.roles });
}
