# frontend-features-admin-settings

Lazy-loaded admin-console tab for the app's account-retention settings.

- Mounted at **`/app/admin/settings`** as a child of the `admin` route
  (keeps the parent `roleGuard('admin')`), and registered as a tab via
  `provideAdminTab` — not its own sidenav entry.
- `ADMIN_SETTINGS_ROUTES` — the lazy route group (one page).
- `AdminSettingsService` — typed HTTP: `GET`/`PATCH`
  `${API_BASE_URL}/admin/settings`, returning
  `{ accountRetention: { inactiveDays, warningDays } }`.
- `AdminSettingsPage` — reactive form to view and edit those two values;
  the server validates `warningDays < inactiveDays` (`400 INVALID_SETTINGS`).
