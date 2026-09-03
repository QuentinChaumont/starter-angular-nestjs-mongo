/**
 * Optional bridge to the role catalogue (V2.2 step 44). The `user` feature
 * never depends on `role` directly — it only injects this token when the
 * `role` brick is installed and provides an implementation. When absent,
 * roles are accepted as free strings (V1 behaviour).
 */
export const ROLE_CATALOG = Symbol('ROLE_CATALOG');

export interface RoleCatalog {
  /**
   * Rejects (`ValidationError UNKNOWN_ROLE`) if any of `names` is not a
   * role in the catalogue. An empty list is always fine.
   */
  assertAllExist(names: string[]): Promise<void>;
}
