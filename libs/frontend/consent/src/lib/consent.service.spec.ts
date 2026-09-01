import { TestBed } from '@angular/core/testing';
import { CONSENT_CONFIG, ConsentConfig } from './consent.config';
import { ConsentService } from './consent.service';

const CONFIG: ConsentConfig = {
  policyVersion: 'v2',
  expiresInDays: 100,
  categories: [
    { id: 'essential', label: 'Essential', description: '', essential: true },
    { id: 'analytics', label: 'Analytics', description: '' },
  ],
  legal: { cookiePolicyRoute: '/legal/cookies', privacyPolicyRoute: '/legal/privacy' },
};

function build(): ConsentService {
  TestBed.configureTestingModule({
    providers: [{ provide: CONSENT_CONFIG, useValue: CONFIG }],
  });
  return TestBed.inject(ConsentService);
}

describe('ConsentService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('starts undecided: banner visible, only essential granted', () => {
    const s = build();
    expect(s.hasDecided()).toBe(false);
    expect(s.bannerVisible()).toBe(true);
    expect(s.isGranted('essential')()).toBe(true);
    expect(s.isGranted('analytics')()).toBe(false);
  });

  it('acceptAll grants everything and persists the decision', () => {
    const s = build();
    s.acceptAll();

    expect(s.hasDecided()).toBe(true);
    expect(s.bannerVisible()).toBe(false);
    expect(s.isGranted('analytics')()).toBe(true);

    const stored = JSON.parse(localStorage.getItem('app.consent') as string);
    expect(stored.version).toBe('v2');
    expect(stored.decision.analytics).toBe(true);
  });

  it('rejectAll is a decision: banner hidden, optional categories off', () => {
    const s = build();
    s.rejectAll();
    expect(s.hasDecided()).toBe(true);
    expect(s.isGranted('analytics')()).toBe(false);
    expect(s.isGranted('essential')()).toBe(true);
  });

  it('save() forces essential on regardless of the passed decision', () => {
    const s = build();
    s.save({ essential: false, analytics: true });
    expect(s.isGranted('essential')()).toBe(true);
    expect(s.isGranted('analytics')()).toBe(true);
  });

  it('restores a valid stored decision on construction', () => {
    localStorage.setItem(
      'app.consent',
      JSON.stringify({
        version: 'v2',
        decidedAt: Date.now(),
        decision: { essential: true, analytics: true },
      }),
    );
    const s = build();
    expect(s.hasDecided()).toBe(true);
    expect(s.isGranted('analytics')()).toBe(true);
  });

  it('re-asks when the stored decision is expired', () => {
    localStorage.setItem(
      'app.consent',
      JSON.stringify({
        version: 'v2',
        decidedAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
        decision: { essential: true, analytics: true },
      }),
    );
    const s = build();
    expect(s.hasDecided()).toBe(false);
    expect(s.isGranted('analytics')()).toBe(false);
  });

  it('re-asks when the policy version changed', () => {
    localStorage.setItem(
      'app.consent',
      JSON.stringify({
        version: 'v1',
        decidedAt: Date.now(),
        decision: { essential: true, analytics: true },
      }),
    );
    const s = build();
    expect(s.hasDecided()).toBe(false);
  });

  it('falls back to undecided when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const s = build();
    expect(s.hasDecided()).toBe(false);
    expect(() => s.acceptAll()).not.toThrow();
  });

  it('reopen() bumps the tick', () => {
    const s = build();
    expect(s.reopenTick()).toBe(0);
    s.reopen();
    expect(s.reopenTick()).toBe(1);
  });
});
