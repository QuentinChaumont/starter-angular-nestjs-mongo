import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { of, switchMap } from 'rxjs';

/** Built-in English copy for the common validators. Override per-field with
 * `[messages]` (e.g. translated strings). */
const DEFAULT_MESSAGES: Record<string, (error: unknown) => string> = {
  required: () => 'This field is required.',
  email: () => 'Enter a valid email address.',
  minlength: (e) =>
    `Use at least ${(e as { requiredLength?: number }).requiredLength ?? ''} characters.`.replace(
      '  ',
      ' ',
    ),
  maxlength: (e) =>
    `Use at most ${(e as { requiredLength?: number }).requiredLength ?? ''} characters.`.replace(
      '  ',
      ' ',
    ),
  pattern: () => "This value isn't in the expected format.",
};

/**
 * Renders the first active validation error for a control, but only once
 * it's been touched — so a pristine form stays quiet. Replaces the
 * scattered `@if (fooError())` blocks in the auth and profile forms.
 *
 * ```html
 * <lib-form-errors [control]="form.controls.email" />
 * <lib-form-errors [control]="form.controls.password"
 *   [messages]="{ minlength: 'auth.reset.passwordHint' | transloco: { count: 8 } }" />
 * ```
 */
@Component({
  selector: 'lib-form-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as text) {
      <p class="form-errors" role="alert">{{ text }}</p>
    }
  `,
  styles: `
    .form-errors {
      margin: 2px 0 0;
      font-size: 0.75rem;
      color: var(--app-color-error);
    }
  `,
})
export class FormErrors {
  readonly control = input.required<AbstractControl | null | undefined>();
  /** Per-error-key override text, keyed by validator name. */
  readonly messages = input<Record<string, string>>({});
  /** Show errors before the control is touched. */
  readonly eager = input(false);

  /** Re-evaluate when the control's status / touched state changes. */
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) => control?.events ?? of(null)),
    ),
  );

  protected readonly message = computed(() => {
    this.controlEvents();
    const control = this.control();
    if (!control || !control.errors) {
      return null;
    }
    if (!this.eager() && !control.touched) {
      return null;
    }
    return firstMessage(control.errors, this.messages());
  });
}

function firstMessage(
  errors: ValidationErrors,
  overrides: Record<string, string>,
): string | null {
  for (const key of Object.keys(errors)) {
    if (overrides[key]) {
      return overrides[key];
    }
    const build = DEFAULT_MESSAGES[key];
    if (build) {
      return build(errors[key]);
    }
  }
  return 'This value is invalid.';
}
