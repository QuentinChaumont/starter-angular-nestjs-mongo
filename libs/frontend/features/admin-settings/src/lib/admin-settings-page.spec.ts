import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AdminSettingsPage } from './admin-settings-page';

describe('AdminSettingsPage', () => {
  let fixture: ComponentFixture<AdminSettingsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminSettingsPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('http://api.test/admin/settings').flush({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads current values into the form', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { value: { inactiveDays: number | null; warningDays: number | null } };
    };
    expect(cmp.form.value.inactiveDays).toBe(180);
    expect(cmp.form.value.warningDays).toBe(14);
  });

  it('sends null for a cleared retention field', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: unknown) => void };
      submit: () => void;
    };
    cmp.form.patchValue({ inactiveDays: null, warningDays: null });
    cmp.submit();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.body).toEqual({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
    req.flush({ accountRetention: { inactiveDays: null, warningDays: null } });
  });

  it('blocks submit when warningDays >= inactiveDays', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: unknown) => void; invalid: boolean };
      submit: () => void;
    };
    cmp.form.patchValue({ inactiveDays: 10, warningDays: 10 });
    cmp.submit();
    http.expectNone('http://api.test/admin/settings');
    expect(cmp.form.invalid).toBe(true);
  });
});
