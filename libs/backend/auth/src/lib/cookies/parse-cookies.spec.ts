import { parseCookies } from './parse-cookies';

describe('parseCookies', () => {
  it('returns an empty object for a missing or empty header', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
  });

  it('parses multiple cookies and trims whitespace', () => {
    expect(parseCookies('refresh_token=abc; csrf-token=def')).toEqual({
      refresh_token: 'abc',
      'csrf-token': 'def',
    });
  });

  it('URL-decodes values and keeps "=" inside a value', () => {
    expect(parseCookies('a=one%20two; b=x=y')).toEqual({ a: 'one two', b: 'x=y' });
  });

  it('skips malformed segments', () => {
    expect(parseCookies('novalue; =noname; ok=1')).toEqual({ ok: '1' });
  });
});
