import { parseDurationMs } from './parse-duration';

describe('parseDurationMs', () => {
  it.each([
    ['30d', 2_592_000_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['45s', 45_000],
    ['500ms', 500],
    ['3600', 3_600_000],
  ])('parses "%s" to %i ms', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on an unparseable value', () => {
    expect(() => parseDurationMs('soon')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('10y')).toThrow(/Invalid duration/);
  });
});
