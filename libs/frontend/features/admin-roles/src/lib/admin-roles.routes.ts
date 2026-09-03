import { Route } from '@angular/router';
import { AdminRolesPage } from './admin-roles-page';

/** Lazy route group mounted at `/app/admin/roles` (V2.2 step 44). The
 * parent route keeps its `roleGuard('admin')`. */
export const ADMIN_ROLES_ROUTES: Route[] = [
  { path: '', component: AdminRolesPage, title: 'Roles' },
];
