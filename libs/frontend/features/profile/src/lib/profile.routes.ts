import { Route } from '@angular/router';
import { unsavedChangesGuard } from '@org/frontend-feedback';
import { ProfilePage } from './profile-page';

/** Lazy route group for `/app/profile` (V2.1 step 34). The
 * `unsavedChangesGuard` (V2.3 step 49) prompts before navigating away from
 * an edited-but-unsaved form. */
export const PROFILE_ROUTES: Route[] = [
  { path: '', component: ProfilePage, canDeactivate: [unsavedChangesGuard] },
];
