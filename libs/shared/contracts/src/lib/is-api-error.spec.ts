import { ApiError } from './api-error.js';
import { isApiError } from './is-api-error.js';

describe('isApiError', () => {
  it('accepts a well-formed ApiError', () => {
    const error: ApiError = {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      requestId: 'req-1',
    };

    expect(isApiError(error)).toBe(true);
  });

  it('rejects null and non-objects', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('error')).toBe(false);
  });

  it('rejects an object missing required fields', () => {
    expect(isApiError({ statusCode: 404, code: 'X' })).toBe(false);
    expect(isApiError({ code: 'X', message: 'oops' })).toBe(false);
  });
});
