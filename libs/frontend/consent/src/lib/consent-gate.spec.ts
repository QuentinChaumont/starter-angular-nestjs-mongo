import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONSENT_CONFIG, ConsentConfig } from './consent.config';
import { ConsentIf, runWhenConsented } from './consent-gate';
import { ConsentService } from './consent.service';

const CONFIG: ConsentConfig = {
  policyVersion: 'v1',
  expiresInDays: 100,
  categories: [
    { id: 'essential', label: 'E', description: '', essential: true },
    { id: 'analytics', label: 'A', description: '' },
  ],
  legal: { cookiePolicyRoute: '/legal/cookies', privacyPolicyRoute: '/legal/privacy' },
};

@Component({ template: '' })
class GateHost {
  runs = 0;
  constructor() {
    runWhenConsented('analytics', () => this.runs++);
  }
}

@Component({
  imports: [ConsentIf],
  template: `<span *consentIf="'analytics'">GATED</span>`,
})
class DirectiveHost {}

describe('consent gate', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: CONSENT_CONFIG, useValue: CONFIG }],
    });
  });

  describe('runWhenConsented', () => {
    it('runs the callback only once, after consent is granted', () => {
      const fixture = TestBed.createComponent(GateHost);
      fixture.detectChanges();
      expect(fixture.componentInstance.runs).toBe(0);

      TestBed.inject(ConsentService).acceptAll();
      fixture.detectChanges();
      expect(fixture.componentInstance.runs).toBe(1);

      fixture.detectChanges();
      expect(fixture.componentInstance.runs).toBe(1);
    });

    it('runs immediately when already granted', () => {
      TestBed.inject(ConsentService).acceptAll();
      const fixture = TestBed.createComponent(GateHost);
      fixture.detectChanges();
      expect(fixture.componentInstance.runs).toBe(1);
    });
  });

  describe('*consentIf', () => {
    it('renders the content only while the category is consented', () => {
      const fixture = TestBed.createComponent(DirectiveHost);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
        'GATED',
      );

      TestBed.inject(ConsentService).acceptAll();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'GATED',
      );

      TestBed.inject(ConsentService).rejectAll();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
        'GATED',
      );
    });
  });
});
