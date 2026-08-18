import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

const ACCEPTABLE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9-_.]{1,100}$/;

/**
 * Incoming request IDs come from an untrusted header, so only a narrow,
 * log-injection-safe shape is accepted; anything else falls back to a
 * freshly generated ID.
 */
export function resolveRequestId(headerValue: unknown): string {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (
    typeof candidate === 'string' &&
    ACCEPTABLE_REQUEST_ID_PATTERN.test(candidate)
  ) {
    return candidate;
  }

  return randomUUID();
}
