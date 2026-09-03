import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { base32Decode, base32Encode } from './base32';

/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30s step) — the parameters every
 * authenticator app (Google Authenticator, 1Password, …) defaults to.
 * Built on `node:crypto` only; see `base32.ts` for the rationale.
 */
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
const ALGORITHM = 'sha1';

/** A fresh random secret, base32-encoded (160 bits, the RFC 6238 default). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac(ALGORITHM, secret).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/** The code for `secret` at `atMs` (defaults to now). */
export function generateTotp(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/**
 * Constant-time check of `token` against `secret`, tolerating a clock skew
 * of `window` steps either way (default ±1 = ±30s).
 */
export function verifyTotp(
  secret: string,
  token: string,
  options: { window?: number; atMs?: number } = {},
): boolean {
  const { window = 1, atMs = Date.now() } = options;
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(token)) {
    return false;
  }

  const secretBytes = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
  const tokenBytes = Buffer.from(token);

  for (let drift = -window; drift <= window; drift += 1) {
    const candidate = Buffer.from(hotp(secretBytes, counter + drift));
    if (
      candidate.length === tokenBytes.length &&
      timingSafeEqual(candidate, tokenBytes)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The `otpauth://totp/...` URI an authenticator app imports (also the
 * payload encoded into the setup QR code).
 */
export function otpauthUri(params: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = `${params.issuer}:${params.accountName}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}
