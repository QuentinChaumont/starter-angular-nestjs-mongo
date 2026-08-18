import { ApiError } from './api-error.js';

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).statusCode === 'number' &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}
