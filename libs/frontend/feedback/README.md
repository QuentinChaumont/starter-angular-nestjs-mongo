# frontend-feedback

Centralised popups and toasts, plus the `ApiError` → toast bridge.
Depends on `frontend-design`; see [`BRICKS.md`](../../../BRICKS.md) at
the repo root to remove this brick.

## Exposes (`@org/frontend-feedback`)

| Export                                                      | Use                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DialogService`                                             | `confirm(opts)` / `alert(opts)` → `Observable<boolean>` / `<void>`; `open(component, config)` typed passthrough with shared defaults. |
| `NotificationService`                                       | `success` / `info` / `warn` / `error(message, opts?)` over `MatSnackBar`.                                                             |
| `httpErrorInterceptor`, `SKIP_ERROR_TOAST`                  | The `ApiError` → toast interceptor + its per-request opt-out.                                                                         |
| `unsavedChangesGuard`, `HasUnsavedChanges`                  | `canDeactivate` guard: confirms before leaving a component that reports unsaved edits.                                                |
| `provideFeedback()`                                         | Shared `MatDialog` defaults.                                                                                                          |
| `provideNotificationConfig(partial)`, `NOTIFICATION_CONFIG` | Toast durations.                                                                                                                      |

## Dialogs

`DialogService` is **not** a re-export of `MatDialog` — it fixes the
conventions (420px width, focus/restore behaviour, a single built-in
confirm/alert dialog). `confirm()` resolves `false` on cancel **or**
Escape.

```ts
this.dialog.confirm({ title: 'Delete user?', message: '…', danger: true })
  .subscribe((ok) => { if (ok) … });
```

## Error toasts

`httpErrorInterceptor` runs **after** `authInterceptor` (the app wires the
order in `provideHttpClient(withInterceptors([...]))`). It:

- ignores `401` (the auth flow owns it — a successful silent refresh never
  flashes a toast);
- for an `ApiError` body: toasts `message` + a **Copy ID** action when a
  `requestId` is present;
- for status `0`: a network-error toast;
- for `5xx`: a generic retry toast.

Opt out for a call you handle inline:

```ts
http.post(url, body, {
  context: new HttpContext().set(SKIP_ERROR_TOAST, true),
});
```

## Unsaved-changes guard (V2.3 step 49)

A routed component implements `HasUnsavedChanges` and the route attaches
`unsavedChangesGuard`:

```ts
export class ProfilePage implements HasUnsavedChanges {
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }
}

// route
{ path: '', component: ProfilePage, canDeactivate: [unsavedChangesGuard] }
```

When leaving would discard something, the guard opens a
`DialogService.confirm` ("Leave" / "Stay"). Flip `hasUnsavedChanges()` back
to `false` after a successful save (`form.markAsPristine()`) so a completed
submission navigates cleanly.

## i18n

Dialog / toast strings are hard-coded English — a deliberate limitation.
The service layer is the single place to route them through a translation
pipe later.

## Running unit tests

`nx test frontend-feedback`.
