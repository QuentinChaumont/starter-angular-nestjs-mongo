import { ConsentRecord } from './consent.types';

const STORAGE_KEY = 'app.consent';

function isRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<ConsentRecord>;
  return (
    typeof candidate.version === 'string' &&
    typeof candidate.decidedAt === 'number' &&
    !!candidate.decision &&
    typeof candidate.decision === 'object'
  );
}

export function readStoredConsent(): ConsentRecord | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredConsent(record: ConsentRecord): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable — the banner will simply reappear next visit
  }
}

export function clearStoredConsent(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}
