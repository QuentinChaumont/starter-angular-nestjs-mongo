import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(AdminAuditService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the data-table query onto /audit params', () => {
    service
      .list({
        page: 2,
        pageSize: 25,
        sort: 'at',
        dir: 'asc',
        filters: { actor: 'ada', action: 'auth.' },
      })
      .subscribe();

    const req = http.expectOne(
      (r) => r.url === '/api/audit' && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('dir')).toBe('asc');
    expect(req.request.params.get('actor')).toBe('ada');
    expect(req.request.params.get('action')).toBe('auth.');
    req.flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });

  it('defaults to newest-first when not sorted by "at"', () => {
    service
      .list({ page: 1, pageSize: 25, sort: null, dir: 'asc', filters: {} })
      .subscribe();

    const req = http.expectOne((r) => r.url === '/api/audit');
    expect(req.request.params.get('dir')).toBe('desc');
    req.flush({ items: [], total: 0, page: 1, pageSize: 25 });
  });
});
