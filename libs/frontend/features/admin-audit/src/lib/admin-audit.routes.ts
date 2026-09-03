import { Route } from '@angular/router';
import { AdminAuditPage } from './admin-audit-page';

/** Lazy route group mounted at `/app/admin/audit` (V2.3 step 45). The
 * parent route keeps its `roleGuard('admin')`. */
export const ADMIN_AUDIT_ROUTES: Route[] = [
  { path: '', component: AdminAuditPage, title: 'Audit log' },
];
