import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import { Observable } from 'rxjs';

/** Mirror of the backend `AppSettings` shape. Kept local on purpose — the
 * frontend never imports a backend lib. */
export interface AdminSettings {
  accountRetention: {
    inactiveDays: number | null;
    warningDays: number | null;
  };
}

export type AdminSettingsPatch = {
  accountRetention?: Partial<AdminSettings['accountRetention']>;
};

/** Typed HTTP for the admin console's settings tab. `GET`/`PATCH`
 * `/admin/settings`; the server validates `warningDays < inactiveDays`. */
@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/admin/settings`;

  load(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(this.base, { withCredentials: true });
  }

  save(patch: AdminSettingsPatch): Observable<AdminSettings> {
    return this.http.patch<AdminSettings>(this.base, patch, {
      withCredentials: true,
    });
  }
}
