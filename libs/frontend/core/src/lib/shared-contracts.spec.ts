import { ApiError, isApiError, PaginatedResponse } from '@org/shared-contracts';

describe('shared contracts (imported from Angular)', () => {
  it('resolves the ApiError contract and its type guard', () => {
    const error: ApiError = {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    };

    expect(isApiError(error)).toBe(true);
    expect(isApiError({})).toBe(false);
  });

  it('resolves the PaginatedResponse contract', () => {
    const page: PaginatedResponse<string> = {
      items: ['a', 'b'],
      total: 2,
      page: 1,
      pageSize: 10,
    };

    expect(page.items).toHaveLength(2);
  });
});
