import { sanitizeRelativePath } from './sanitize-relative-path';

describe('sanitizeRelativePath', () => {
  it('keeps a single-slash absolute path', () => {
    expect(sanitizeRelativePath('/app/reports', '/app')).toBe('/app/reports');
    expect(sanitizeRelativePath('/', '/app')).toBe('/');
  });

  it.each([
    undefined,
    '',
    'app',
    '//evil.com',
    'https://evil.com',
    'http://evil.com',
    '/app\\..\\x',
    '/app\nSet-Cookie: x',
  ])('falls back for %p', (value) => {
    expect(sanitizeRelativePath(value as string | undefined, '/app')).toBe(
      '/app',
    );
  });
});
