import { InjectionToken, Provider } from '@angular/core';

/**
 * Base URL every backend call is made against. Defaults to `/api` (same
 * origin — matches the NestJS global prefix). In local dev, point it at the
 * running API (`http://localhost:3000/api`) via `provideApiBaseUrl(...)` or
 * a dev-server proxy.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

export function provideApiBaseUrl(url: string): Provider {
  return { provide: API_BASE_URL, useValue: url.replace(/\/$/, '') };
}
