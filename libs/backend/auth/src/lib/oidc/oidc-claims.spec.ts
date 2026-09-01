import { extractRoles } from './oidc-claims';

describe('extractRoles', () => {
  it('returns [] when no path is configured', () => {
    expect(extractRoles({ roles: ['admin'] }, undefined)).toEqual([]);
  });

  it('reads a top-level string array claim', () => {
    expect(extractRoles({ roles: ['admin', 'editor'] }, 'roles')).toEqual([
      'admin',
      'editor',
    ]);
  });

  it('walks a dot-path (Keycloak style)', () => {
    const claims = { realm_access: { roles: ['admin'] } };
    expect(extractRoles(claims, 'realm_access.roles')).toEqual(['admin']);
  });

  it('returns [] for a missing path or a non-string-array value', () => {
    expect(extractRoles({ realm_access: {} }, 'realm_access.roles')).toEqual([]);
    expect(extractRoles({ roles: 'admin' }, 'roles')).toEqual([]);
    expect(extractRoles({ roles: [1, 2] }, 'roles')).toEqual([]);
  });
});
