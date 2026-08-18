/**
 * Public shape of every error response returned by the API, as produced by
 * the backend's GlobalExceptionFilter. Matches the persisted error type,
 * not the internal ApplicationError class hierarchy.
 */
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}
