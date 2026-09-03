import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type { DataPage, DataQuery } from '@org/frontend-ui';
import type { AuditEvent, PaginatedAuditEvents } from '@org/shared-contracts';
import { Observable, map } from 'rxjs';

/** HTTP for the audit console (V2.3 step 45). Admin-only server-side. */
@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/audit`;

  /** `<lib-data-table>` data source. The `actor` and `action` columns map
   * to the endpoint's substring filters; sorting is only by `at`. */
  list(query: DataQuery): Observable<DataPage<AuditEvent>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('dir', query.sort === 'at' && query.dir === 'asc' ? 'asc' : 'desc');
    if (query.filters['actor']) {
      params = params.set('actor', query.filters['actor']);
    }
    if (query.filters['action']) {
      params = params.set('action', query.filters['action']);
    }
    return this.http
      .get<PaginatedAuditEvents>(this.base, { params, withCredentials: true })
      .pipe(map((page) => ({ items: page.items, total: page.total })));
  }
}
