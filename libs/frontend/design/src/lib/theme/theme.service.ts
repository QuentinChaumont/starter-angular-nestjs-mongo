import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { applyColorOverrides, applyMode } from './apply-theme';
import {
  THEME_MODES,
  ThemeMode,
  ThemeToken,
  isThemeToken,
  isValidHexColor,
  normalizeHex,
} from './theme.tokens';

const MODE_KEY = 'app.theme.mode';
const OVERRIDES_KEY = 'app.theme.overrides';
const DEFAULT_MODE: ThemeMode = 'system';

type ColorOverrides = Partial<Record<ThemeToken, string>>;

function safeGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private mode / storage disabled — preferences just won't persist.
  }
}

function readStoredMode(): ThemeMode {
  const raw = safeGet(MODE_KEY);
  return raw && (THEME_MODES as readonly string[]).includes(raw)
    ? (raw as ThemeMode)
    : DEFAULT_MODE;
}

function readStoredOverrides(): ColorOverrides {
  const raw = safeGet(OVERRIDES_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const result: ColorOverrides = {};
    for (const [token, value] of Object.entries(parsed)) {
      if (
        isThemeToken(token) &&
        typeof value === 'string' &&
        isValidHexColor(value)
      ) {
        result[token] = normalizeHex(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Runtime theme preferences: colour-scheme mode and per-token colour
 * overrides. Defaults come from the charter (`design.config.ts` /
 * `_tokens.scss`); this service only ever **overrides** on top of them,
 * and persists the choice per browser in `localStorage`. UI preferences
 * only — nothing security-sensitive.
 *
 * Reads are signals (so the settings panel and anything else stays
 * reactive); writes apply to `<html>` and persist synchronously.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;

  private readonly _mode = signal<ThemeMode>(readStoredMode());
  private readonly _overrides = signal<ColorOverrides>(readStoredOverrides());

  readonly mode = this._mode.asReadonly();
  readonly overrides = this._overrides.asReadonly();

  constructor() {
    // Apply the persisted theme immediately, before first paint.
    applyMode(this.root, this._mode());
    applyColorOverrides(this.root, this._overrides());
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    applyMode(this.root, mode);
    safeSet(MODE_KEY, mode);
  }

  setColor(token: ThemeToken, hex: string): void {
    if (!isValidHexColor(hex)) {
      return;
    }
    this._overrides.update((current) => ({
      ...current,
      [token]: normalizeHex(hex),
    }));
    this.flushOverrides();
  }

  resetColor(token: ThemeToken): void {
    this._overrides.update((current) => {
      const next = { ...current };
      delete next[token];
      return next;
    });
    this.flushOverrides();
  }

  resetAll(): void {
    this.setMode(DEFAULT_MODE);
    this._overrides.set({});
    this.flushOverrides();
  }

  private flushOverrides(): void {
    const overrides = this._overrides();
    applyColorOverrides(this.root, overrides);
    safeSet(OVERRIDES_KEY, JSON.stringify(overrides));
  }
}
