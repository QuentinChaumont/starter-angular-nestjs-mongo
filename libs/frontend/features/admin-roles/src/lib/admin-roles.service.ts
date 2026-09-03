import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type { DataPage, DataQuery } from '@org/frontend-ui';
import type {
  CreateRoleRequest,
  PaginatedRoles,
  Role,
  UpdateRoleRequest,
} from '@org/shared-contracts';
import { Observable, map } from 'rxjs';

/** HTTP for the role catalogue admin console (V2.2 step 44). Every route is
 * admin-only server-side (`roleGuard('admin')` also gates the page). */
@Injectable({ providedIn: 'root' })
export class AdminRolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/roles`;

  /** `<lib-data-table>` data source. Only the `name` column is filterable. */
  list(query: DataQuery): Observable<DataPage<Role>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);
    if (query.sort) {
      params = params.set('sort', query.sort).set('dir', query.dir);
    }
    if (query.filters['name']) {
      params = params.set('search', query.filters['name']);
    }
    return this.http
      .get<PaginatedRoles>(this.base, { params, withCredentials: true })
      .pipe(map((page) => ({ items: page.items, total: page.total })));
  }

  /** Every role name — feeds the user console's role multi-select. */
  names(): Observable<string[]> {
    return this.http
      .get<PaginatedRoles>(this.base, {
        params: new HttpParams().set('pageSize', 200).set('sort', 'name'),
        withCredentials: true,
      })
      .pipe(map((page) => page.items.map((r) => r.name)));
  }

  create(body: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.base, body, { withCredentials: true });
  }

  update(id: string, body: UpdateRoleRequest): Observable<Role> {
    return this.http.patch<Role>(`${this.base}/${id}`, body, {
      withCredentials: true,
    });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, {
      withCredentials: true,
    });
  }
}
