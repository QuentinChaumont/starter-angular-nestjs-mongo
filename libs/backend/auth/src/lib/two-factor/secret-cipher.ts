import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

/**
 * Symmetric encryption for the TOTP secret at rest (AES-256-GCM). The key
 * is derived from `JWT_SECRET` via HKDF, so no extra environment variable
 * is needed (V2.2 step 43 decision) — a project that rotates `JWT_SECRET`
 * invalidates stored 2FA secrets, which is acceptable (users re-enroll).
 *
 * Stored form: base64 of `iv(12) || authTag(16) || ciphertext`.
 */
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(jwtSecret: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', jwtSecret, 'two-factor', 'totp-secret-v1', 32),
  );
}

export function encryptSecret(plain: string, jwtSecret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(jwtSecret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64',
  );
}

export function decryptSecret(payload: string, jwtSecret: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', deriveKey(jwtSecret), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
