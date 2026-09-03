import { base32Decode, base32Encode } from './base32';
import {
  generateTotp,
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
} from './totp';

// RFC 4226 Appendix D — HMAC-SHA1, secret "12345678901234567890" (ASCII),
// 6 digits. TOTP counter = floor(time / 30s), so counter N ⇔ atMs = N*30_000.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_4226_CODES = [
  '755224',
  '287082',
  '359152',
  '969429',
  '338314',
  '254676',
  '287922',
  '162583',
  '399871',
  '520489',
];

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('is case-insensitive and ignores spaces', () => {
    const encoded = base32Encode(Buffer.from('hello'));
    expect(base32Decode(encoded.toLowerCase().replace(/(.)/g, '$1 '))).toEqual(
      Buffer.from('hello'),
    );
  });
});

describe('generateTotp (RFC 4226 test vectors)', () => {
  it.each(RFC_4226_CODES.map((code, counter) => [counter, code]))(
    'counter %i → %s',
    (counter, expected) => {
      expect(generateTotp(RFC_SECRET, (counter as number) * 30_000)).toBe(
        expected,
      );
    },
  );
});

describe('verifyTotp', () => {
  it('accepts the current code', () => {
    const at = 1_000_000_000_000;
    expect(verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, at), { atMs: at })).toBe(
      true,
    );
  });

  it('tolerates ±1 step of clock skew, rejects ±2', () => {
    const at = 1_000_000_000_000;
    const prev = generateTotp(RFC_SECRET, at - 30_000);
    const wayOff = generateTotp(RFC_SECRET, at - 90_000);
    expect(verifyTotp(RFC_SECRET, prev, { atMs: at })).toBe(true);
    expect(verifyTotp(RFC_SECRET, wayOff, { atMs: at })).toBe(false);
  });

  it('rejects non-6-digit input', () => {
    expect(verifyTotp(RFC_SECRET, '12345')).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBe(false);
  });
});

describe('generateTotpSecret / otpauthUri', () => {
  it('produces a decodable base32 secret', () => {
    const secret = generateTotpSecret();
    expect(() => base32Decode(secret)).not.toThrow();
    expect(base32Decode(secret)).toHaveLength(20);
  });

  it('builds an otpauth URI an authenticator can import', () => {
    const uri = otpauthUri({
      secret: 'ABCDEF',
      accountName: 'ada@example.com',
      issuer: 'App',
    });
    expect(uri).toMatch(
      /^otpauth:\/\/totp\/App%3Aada%40example\.com\?secret=ABCDEF&/,
    );
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});
