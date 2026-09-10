import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url';
import { PublicSettingsService } from './public-settings';

describe('PublicSettingsService', () => {
  let service: PublicSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });
    service = TestBed.inject(PublicSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs /public/settings without credentials', () => {
    service.get().subscribe();
    const req = http.expectOne('http://api.test/public/settings');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(false);
    req.flush({ accountRetention: { inactiveDays: 90, warningDays: 7 } });
  });

  it('emits the safe fallback when the request errors', (done) => {
    service.get().subscribe((v) => {
      expect(v).toEqual({
        accountRetention: { inactiveDays: null, warningDays: null },
      });
      done();
    });
    http
      .expectOne('http://api.test/public/settings')
      .error(new ProgressEvent('fail'));
  });
});
