import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { PrivacyPolicy } from './privacy-policy.page';

function setup() {
  TestBed.configureTestingModule({
    imports: [PrivacyPolicy],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: 'http://api.test' },
    ],
  });
  const fixture: ComponentFixture<PrivacyPolicy> =
    TestBed.createComponent(PrivacyPolicy);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, http };
}

describe('PrivacyPolicy retention section', () => {
  it('shows the "not auto-deleted" wording when inactiveDays is null', () => {
    const { fixture, http } = setup();
    http.expectOne('http://api.test/public/settings').flush({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/do not automatically delete inactive accounts/i);
  });

  it('shows the concrete period and warning when configured', () => {
    const { fixture, http } = setup();
    http.expectOne('http://api.test/public/settings').flush({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('180 days');
    expect(text).toContain('14 days');
  });

  it('falls back to the "not auto-deleted" wording if the request fails', () => {
    const { fixture, http } = setup();
    http
      .expectOne('http://api.test/public/settings')
      .error(new ProgressEvent('fail'));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/do not automatically delete inactive accounts/i);
  });
});
