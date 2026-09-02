import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type { PaginatedUsers, UserSummary } from '@org/shared-contracts';
import { Observable } from 'rxjs';

/** HTTP for the admin console (V2.1 step 35). Every route is admin-only
 * server-side (`roleGuard('admin')` also gates the page). */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/users`;

  list(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Observable<PaginatedUsers> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PaginatedUsers>(this.base, {
      params,
      withCredentials: true,
    });
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
