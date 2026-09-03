import { Route } from '@angular/router';
import { AdminUsersPage } from './admin-users-page';

/** Lazy route group mounted at `/app/admin` (V2.1 step 35). The parent
 * route keeps its `roleGuard('admin')`. */
export const ADMIN_USERS_ROUTES: Route[] = [
  { path: '', component: AdminUsersPage, title: 'Users' },
];
