import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONSENT_CONFIG, ConsentConfig } from '../consent.config';
import { ConsentBanner } from '../banner/consent-banner.component';

const CONFIG: ConsentConfig = {
  policyVersion: 'v1',
  expiresInDays: 100,
  categories: [
    { id: 'essential', label: 'E', description: '', essential: true },
    { id: 'analytics', label: 'A', description: '' },
  ],
  legal: {
    cookiePolicyRoute: '/legal/cookies',
    privacyPolicyRoute: '/legal/privacy',
  },
};

describe('ConsentPreferences dialog', () => {
  it('opens from the banner and closes again on Cancel', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ConsentBanner],
      providers: [
        provideRouter([]),
        { provide: CONSENT_CONFIG, useValue: CONFIG },
      ],
    });
    const fixture = TestBed.createComponent(ConsentBanner);
    fixture.detectChanges();

    const customise = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    customise.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelectorAll('.cdk-overlay-pane').length).toBe(1);

    const cancel = Array.from(
      document.querySelectorAll('.cdk-overlay-pane button'),
    ).find((b) => b.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fixture.detectChanges();

    expect(document.querySelectorAll('.cdk-overlay-pane').length).toBe(0);
  });
});
