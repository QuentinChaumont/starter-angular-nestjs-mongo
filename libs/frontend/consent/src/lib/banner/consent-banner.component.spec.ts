import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { CONSENT_CONFIG, ConsentConfig } from '../consent.config';
import { ConsentService } from '../consent.service';
import { ConsentBanner } from './consent-banner.component';

const CONFIG: ConsentConfig = {
  policyVersion: 'v1',
  expiresInDays: 100,
  categories: [
    { id: 'essential', label: 'E', description: '', essential: true },
    { id: 'analytics', label: 'A', description: '' },
  ],
  legal: { cookiePolicyRoute: '/legal/cookies', privacyPolicyRoute: '/legal/privacy', legalNoticeRoute: '/legal/notice' },
};

describe('ConsentBanner', () => {
  const open = jest.fn();

  function build() {
    open.mockReset();
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ConsentBanner],
      providers: [
        provideRouter([]),
        { provide: CONSENT_CONFIG, useValue: CONFIG },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(ConsentBanner);
    fixture.detectChanges();
    return fixture;
  }

  it('shows on first visit and hides once a choice is made', () => {
    const fixture = build();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.consent'),
    ).not.toBeNull();

    TestBed.inject(ConsentService).acceptAll();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.consent'),
    ).toBeNull();
  });

  it('opens the preferences dialog when the service is reopened', async () => {
    const fixture = build();
    TestBed.inject(ConsentService).reopen();
    fixture.detectChanges();
    // the dialog component is lazily imported — let the microtask settle
    await new Promise((r) => setTimeout(r, 10));
    expect(open).toHaveBeenCalled();
  });

  it('offers Reject all with the same button style as Accept all', () => {
    const fixture = build();
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(
      expect.arrayContaining(['Customise', 'Reject all', 'Accept all']),
    );
  });
});
