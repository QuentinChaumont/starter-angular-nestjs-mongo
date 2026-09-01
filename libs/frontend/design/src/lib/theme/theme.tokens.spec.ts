import {
  isThemeToken,
  isValidHexColor,
  normalizeHex,
} from './theme.tokens';

describe('theme tokens', () => {
  it('validates 3/6/8-digit hex, rejects the rest', () => {
    expect(isValidHexColor('#abc')).toBe(true);
    expect(isValidHexColor('#AABBCC')).toBe(true);
    expect(isValidHexColor('#aabbccdd')).toBe(true);
    expect(isValidHexColor('  #4f46e5 ')).toBe(true);

    expect(isValidHexColor('4f46e5')).toBe(false);
    expect(isValidHexColor('#12')).toBe(false);
    expect(isValidHexColor('rgb(0,0,0)')).toBe(false);
    expect(isValidHexColor('')).toBe(false);
  });

  it('normalises to trimmed lowercase', () => {
    expect(normalizeHex('  #4F46E5 ')).toBe('#4f46e5');
  });

  it('narrows known theme tokens', () => {
    expect(isThemeToken('primary')).toBe(true);
    expect(isThemeToken('surface')).toBe(true);
    expect(isThemeToken('outline')).toBe(false);
  });
});
