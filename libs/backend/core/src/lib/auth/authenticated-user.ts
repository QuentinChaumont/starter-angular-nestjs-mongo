/**
 * The identity the rest of the app sees once a request is authenticated.
 * Deliberately independent from Passport's own types, so only this file
 * (and the JWT strategy that produces it) needs to know Passport exists.
 */
export interface AuthenticatedUser {
  id: string;
  roles: string[];
}
