import { Route } from '@angular/router';
import { AdminSettingsPage } from './admin-settings-page';

/** Mounted at `/app/admin/settings`; the parent keeps `roleGuard('admin')`. */
export const ADMIN_SETTINGS_ROUTES: Route[] = [
  { path: '', component: AdminSettingsPage, title: 'Settings' },
];
