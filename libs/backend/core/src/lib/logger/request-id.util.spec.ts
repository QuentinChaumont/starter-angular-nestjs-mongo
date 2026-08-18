import { randomUUID } from 'node:crypto';
import { resolveRequestId } from './request-id.util';

describe('resolveRequestId', () => {
  it('accepts a well-formed incoming header value', () => {
    expect(resolveRequestId('client-generated-id-123')).toBe(
      'client-generated-id-123',
    );
  });

  it('accepts a real UUID', () => {
    const id = randomUUID();
    expect(resolveRequestId(id)).toBe(id);
  });

  it('takes the first value when the header is repeated', () => {
    expect(resolveRequestId(['first-id', 'second-id'])).toBe('first-id');
  });

  it('generates a new id when the header is missing', () => {
    const id = resolveRequestId(undefined);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates a new id when the header value is empty', () => {
    const id = resolveRequestId('');
    expect(id).not.toBe('');
  });

  it('generates a new id when the header contains unacceptable characters', () => {
    const id = resolveRequestId('id with spaces and "quotes"');
    expect(id).not.toBe('id with spaces and "quotes"');
  });

  it('generates a new id when the header value is too long', () => {
    const tooLong = 'a'.repeat(101);
    const id = resolveRequestId(tooLong);
    expect(id).not.toBe(tooLong);
  });
});
