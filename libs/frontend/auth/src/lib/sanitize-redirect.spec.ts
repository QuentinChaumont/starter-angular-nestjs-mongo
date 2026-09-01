import { sanitizeRedirect } from './sanitize-redirect';

describe('sanitizeRedirect', () => {
  it('keeps a single-slash absolute path', () => {
    expect(sanitizeRedirect('/app/reports')).toBe('/app/reports');
    expect(sanitizeRedirect('/')).toBe('/');
  });

  it.each([
    null,
    undefined,
    '',
    'app',
    '//evil.com',
    'https://evil.com',
    '/a\\b',
    '/a b',
  ])('falls back for %p', (value) => {
    expect(sanitizeRedirect(value, '/home')).toBe('/home');
  });

  it('defaults the fallback to "/"', () => {
    expect(sanitizeRedirect('bad')).toBe('/');
  });
});
