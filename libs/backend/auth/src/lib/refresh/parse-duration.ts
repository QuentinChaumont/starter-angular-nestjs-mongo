const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses a short duration string (`"30d"`, `"15m"`, `"3600s"`, `"500ms"`)
 * into milliseconds. A bare number is read as seconds, matching the
 * convention `@nestjs/jwt` uses for `expiresIn`. No external `ms` package —
 * this is all the grammar the starter needs.
 */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${value}". Expected e.g. "30d", "15m", "3600s".`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  return amount * UNIT_TO_MS[unit];
}
