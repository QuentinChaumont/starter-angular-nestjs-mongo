import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AdminSettingsService } from './admin-settings.service';

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });
    service = TestBed.inject(AdminSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs /admin/settings', () => {
    service.load().subscribe();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accountRetention: { inactiveDays: null, warningDays: null } });
  });

  it('PATCHes /admin/settings with the given patch', () => {
    service
      .save({ accountRetention: { inactiveDays: 180, warningDays: 14 } })
      .subscribe();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accountRetention: { inactiveDays: 180, warningDays: 14 } });
  });
});
