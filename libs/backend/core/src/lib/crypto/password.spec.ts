import { hashPassword } from './hash-password';
import { verifyPassword } from './verify-password';

describe('password hashing', () => {
  it('verifies a matching password', async () => {
    const hashed = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', hashed),
    ).resolves.toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hashed = await hashPassword('correct horse battery staple');

    await expect(verifyPassword('wrong password', hashed)).resolves.toBe(
      false,
    );
  });

  it('salts each hash differently, even for the same password', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ]);

    expect(a).not.toBe(b);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-valid-hash')).resolves.toBe(
      false,
    );
  });
});
