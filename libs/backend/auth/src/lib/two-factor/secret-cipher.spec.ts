import { decryptSecret, encryptSecret } from './secret-cipher';

const KEY = 'a-jwt-secret-used-as-the-master-key';

describe('secret-cipher', () => {
  it('round-trips a TOTP secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(decryptSecret(encryptSecret(secret, KEY), KEY)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
  });

  it('fails to decrypt with the wrong key', () => {
    const payload = encryptSecret('secret', KEY);
    expect(() => decryptSecret(payload, 'different-key')).toThrow();
  });

  it('fails to decrypt a tampered payload (GCM auth tag)', () => {
    const raw = Buffer.from(encryptSecret('secret', KEY), 'base64');
    raw[raw.length - 1] ^= 0x01;
    expect(() => decryptSecret(raw.toString('base64'), KEY)).toThrow();
  });
});
