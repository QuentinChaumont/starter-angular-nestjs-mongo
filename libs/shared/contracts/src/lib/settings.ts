/** The subset of application settings exposed without authentication —
 * consumed by the public privacy notice. */
export interface PublicAppSettings {
  accountRetention: {
    inactiveDays: number | null;
    warningDays: number | null;
  };
}
