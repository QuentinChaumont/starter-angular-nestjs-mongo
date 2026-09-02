import { Route } from '@angular/router';
import { ProfilePage } from './profile-page';

/** Lazy route group for `/app/profile` (V2.1 step 34). */
export const PROFILE_ROUTES: Route[] = [{ path: '', component: ProfilePage }];
