import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { CONSENT_CONFIG } from './consent.config';
import { ConsentDecision, ConsentRecord } from './consent.types';
import {
  clearStoredConsent,
  readStoredConsent,
  writeStoredConsent,
} from './consent.storage';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Holds the cookie/tracker consent decision. Nothing non-essential is
 * granted until the user decides; "reject" is a real decision (the banner
 * then stays hidden until the record expires or the policy version bumps).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly config = inject(CONSENT_CONFIG);

  private readonly _record = signal<ConsentRecord | null>(readStoredConsent());
  private readonly _reopenTick = signal(0);
  private readonly grants = new Map<string, Signal<boolean>>();

  /** A stored decision that is still valid (right version, not expired). */
  private readonly activeRecord = computed<ConsentRecord | null>(() => {
    const record = this._record();
    if (!record || record.version !== this.config.policyVersion) {
      return null;
    }
    if (Date.now() - record.decidedAt > this.config.expiresInDays * DAY_MS) {
      return null;
    }
    return record;
  });

  readonly hasDecided = computed(() => this.activeRecord() !== null);
  readonly bannerVisible = computed(() => !this.hasDecided());
  /** Bumped by `reopen()`; the banner watches it to show the preferences. */
  readonly reopenTick = this._reopenTick.asReadonly();
  readonly categories = this.config.categories;

  /** Reactive grant state for a category (essential is always `true`). */
  isGranted(categoryId: string): Signal<boolean> {
    let grant = this.grants.get(categoryId);
    if (!grant) {
      grant = computed(() => {
        const category = this.config.categories.find(
          (c) => c.id === categoryId,
        );
        if (category?.essential) {
          return true;
        }
        return this.activeRecord()?.decision[categoryId] === true;
      });
      this.grants.set(categoryId, grant);
    }
    return grant;
  }

  /** Current effective decision (for pre-filling the preferences dialog). */
  currentDecision(): ConsentDecision {
    const record = this.activeRecord();
    const decision: ConsentDecision = {};
    for (const category of this.config.categories) {
      decision[category.id] = category.essential
        ? true
        : record?.decision[category.id] === true;
    }
    return decision;
  }

  acceptAll(): void {
    this.save(
      Object.fromEntries(this.config.categories.map((c) => [c.id, true])),
    );
  }

  rejectAll(): void {
    this.save(
      Object.fromEntries(
        this.config.categories.map((c) => [c.id, c.essential === true]),
      ),
    );
  }

  save(decision: ConsentDecision): void {
    const normalized: ConsentDecision = {};
    for (const category of this.config.categories) {
      normalized[category.id] = category.essential
        ? true
        : decision[category.id] === true;
    }
    const record: ConsentRecord = {
      version: this.config.policyVersion,
      decidedAt: Date.now(),
      decision: normalized,
    };
    writeStoredConsent(record);
    this._record.set(record);
  }

  /** Forget the decision (mostly for tests / a "reset" affordance). */
  forget(): void {
    clearStoredConsent();
    this._record.set(null);
  }

  reopen(): void {
    this._reopenTick.update((n) => n + 1);
  }
}
