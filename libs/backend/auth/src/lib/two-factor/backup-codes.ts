import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '@org/backend-core';

/**
 * One-time recovery codes for when the authenticator device is lost. Stored
 * **hashed** (scrypt, same as passwords) — shown to the user in plaintext
 * exactly once, at generation.
 */
export const BACKUP_CODE_COUNT = 10;
const CODE_BYTES = 5; // 10 hex chars → formatted `xxxxx-xxxxx`

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const hex = randomBytes(CODE_BYTES).toString('hex');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

export function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(normalize(code))));
}

/**
 * Returns the list of hashes with the one matching `code` removed (single
 * use), or `null` if nothing matched.
 */
export async function consumeBackupCode(
  code: string,
  hashes: string[],
): Promise<string[] | null> {
  const candidate = normalize(code);
  for (let i = 0; i < hashes.length; i += 1) {
    if (await verifyPassword(candidate, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}

/** Accept the code with or without its dash, any case. */
function normalize(code: string): string {
  return code.trim().toLowerCase().replace(/-/g, '');
}
