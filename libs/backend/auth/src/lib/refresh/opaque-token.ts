import { createHash, randomBytes } from 'node:crypto';

/**
 * Generates a URL-safe opaque token (hex). Used both for refresh tokens and
 * for the CSRF double-submit token — neither is a JWT, they're just
 * unguessable random strings the server later looks up / compares.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * SHA-256 of a token, hex-encoded. Refresh tokens are stored hashed so a
 * leaked database dump can't be replayed against `/auth/refresh`. A plain
 * hash (no salt) is fine here: the input already has full entropy, unlike a
 * password.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
