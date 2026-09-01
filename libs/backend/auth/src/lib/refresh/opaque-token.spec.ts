import { generateOpaqueToken, hashToken } from './opaque-token';

describe('opaque tokens', () => {
  it('generates a random hex string of the requested byte length', () => {
    expect(generateOpaqueToken(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(generateOpaqueToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a different token each call', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('hashes deterministically and differently per input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
