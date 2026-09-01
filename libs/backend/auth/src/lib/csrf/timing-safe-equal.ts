import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison. Returns early (false) only on a length
 * mismatch — which for fixed-length random tokens leaks nothing useful.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
