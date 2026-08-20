import { JwtService } from '@nestjs/jwt';
import { buildTestConfig } from './build-test-config';
import { signTestJwt } from './sign-test-jwt';

describe('signTestJwt', () => {
  it('signs a token decodable with the same secret, carrying { sub, roles }', async () => {
    const config = buildTestConfig({ JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' });

    const token = await signTestJwt(config, { id: 'user-1', roles: ['admin'] });

    const payload = await new JwtService({ secret: 'test-secret' }).verifyAsync(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.roles).toEqual(['admin']);
  });

  it('rejects verification with the wrong secret', async () => {
    const config = buildTestConfig({ JWT_SECRET: 'test-secret' });
    const token = await signTestJwt(config, { id: 'user-1', roles: [] });

    await expect(
      new JwtService({ secret: 'wrong-secret' }).verifyAsync(token),
    ).rejects.toThrow();
  });

  it('throws a readable error when JWT_SECRET is not set', async () => {
    const config = buildTestConfig();

    await expect(signTestJwt(config, { id: 'user-1', roles: [] })).rejects.toThrow(
      /requires JWT_SECRET/,
    );
  });
});
