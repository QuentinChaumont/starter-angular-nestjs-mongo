import { readCookie } from './read-cookie';

describe('readCookie', () => {
  it('returns null when the cookie string is empty or the name is absent', () => {
    expect(readCookie(undefined, 'x')).toBeNull();
    expect(readCookie('', 'x')).toBeNull();
    expect(readCookie('a=1; b=2', 'x')).toBeNull();
  });

  it('reads a named cookie and URL-decodes the value', () => {
    expect(readCookie('csrf-token=abc123; other=y', 'csrf-token')).toBe('abc123');
    expect(readCookie('v=one%20two', 'v')).toBe('one two');
  });
});
