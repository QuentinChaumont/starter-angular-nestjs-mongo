import { timingSafeEqualString } from './timing-safe-equal';

describe('timingSafeEqualString', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqualString('abcdef', 'abcdef')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(timingSafeEqualString('abcdef', 'abcxef')).toBe(false);
  });

  it('returns false for strings of different length', () => {
    expect(timingSafeEqualString('abc', 'abcdef')).toBe(false);
  });
});
