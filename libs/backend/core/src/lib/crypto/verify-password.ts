import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

/**
 * Verifies a plaintext password against a hash produced by `hashPassword`.
 * Uses a constant-time comparison so response timing does not leak how
 * much of the derived key matched.
 */
export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  const [salt, key] = hashed.split(':');
  if (!salt || !key) {
    return false;
  }

  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scrypt(plain, salt, keyBuffer.length)) as Buffer;

  return (
    derivedKey.length === keyBuffer.length &&
    timingSafeEqual(derivedKey, keyBuffer)
  );
}
