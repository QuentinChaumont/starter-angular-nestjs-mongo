import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { DialogService } from './dialog/dialog.service';

/**
 * A routed component that may hold edits the user hasn't saved yet.
 * Implement it and attach {@link unsavedChangesGuard} to the route.
 */
export interface HasUnsavedChanges {
  /** `true` while leaving the page would discard something. Flip it back
   * to `false` (e.g. `form.markAsPristine()`) after a successful save. */
  hasUnsavedChanges(): boolean;
}

/**
 * `canDeactivate` guard: if the component reports unsaved changes, ask for
 * confirmation before navigating away (via `DialogService.confirm`). No
 * dialog — and a silent `true` — when there's nothing to lose or the
 * feedback brick's dialog isn't available.
 *
 * ```ts
 * { path: 'profile', canDeactivate: [unsavedChangesGuard], loadChildren: ... }
 * ```
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component,
) => {
  if (!component || typeof component.hasUnsavedChanges !== 'function') {
    return true;
  }
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const dialog = inject(DialogService, { optional: true });
  if (!dialog) {
    return true;
  }

  return dialog.confirm({
    title: 'Leave without saving?',
    message: 'You have unsaved changes on this page. They will be lost.',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    danger: true,
  });
};
