import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type { DataPage, DataQuery } from '@org/frontend-ui';
import type { PaginatedUsers, UserSummary } from '@org/shared-contracts';
import { Observable, map } from 'rxjs';

/** HTTP for the admin console (V2.1 step 35). Every route is admin-only
 * server-side (`roleGuard('admin')` also gates the page). */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/users`;

  /** `<lib-data-table>` data source: column keys (`email` / `name` /
   * `roles`) map straight onto the list endpoint's filter + sort params. */
  list(query: DataQuery): Observable<DataPage<UserSummary>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);
    if (query.sort) {
      params = params.set('sort', query.sort).set('dir', query.dir);
    }
    for (const [key, value] of Object.entries(query.filters)) {
      params = params.set(key, value);
    }
    return this.http
      .get<PaginatedUsers>(this.base, { params, withCredentials: true })
      .pipe(map((page) => ({ items: page.items, total: page.total })));
  }

  setRoles(id: string, roles: string[]): Observable<UserSummary> {
    return this.http.patch<UserSummary>(
      `${this.base}/${id}/roles`,
      { roles },
      { withCredentials: true },
    );
  }

  setStatus(id: string, active: boolean): Observable<UserSummary> {
    return this.http.patch<UserSummary>(
      `${this.base}/${id}/status`,
      { active },
      { withCredentials: true },
    );
  }
}
