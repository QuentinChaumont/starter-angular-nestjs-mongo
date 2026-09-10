import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { PublicAppSettings } from '@org/shared-contracts';
import { Observable, catchError, of } from 'rxjs';
import { API_BASE_URL } from './api-base-url';

/** The safe default used before the request resolves and if it fails — a
 * privacy page must never claim a retention period that isn't configured. */
export const RETENTION_FALLBACK: PublicAppSettings = {
  accountRetention: { inactiveDays: null, warningDays: null },
};

/** Reads the unauthenticated `GET /api/public/settings`. Used by the
 * legal pages to state the real data-retention period. */
@Injectable({ providedIn: 'root' })
export class PublicSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/public/settings`;

  get(): Observable<PublicAppSettings> {
    return this.http
      .get<PublicAppSettings>(this.url)
      .pipe(catchError(() => of(RETENTION_FALLBACK)));
  }
}
