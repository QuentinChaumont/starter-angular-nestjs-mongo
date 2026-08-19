/**
 * Shape encoded in the JWT itself. Kept separate from `AuthenticatedUser`
 * since the token payload is a wire format (short property names, subject
 * to what fits in a JWT) rather than the domain type the rest of the app
 * should depend on.
 */
export interface JwtPayload {
  sub: string;
  roles: string[];
}
