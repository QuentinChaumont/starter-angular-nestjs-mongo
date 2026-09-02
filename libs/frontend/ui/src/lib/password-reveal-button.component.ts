import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * A show/hide toggle for a password field. Place it as a `matSuffix` and
 * point it at the input:
 *
 * ```html
 * <mat-form-field>
 *   <mat-label>Password</mat-label>
 *   <input matInput #pw type="password" formControlName="password" />
 *   <lib-password-reveal-button matSuffix [input]="pw" />
 * </mat-form-field>
 * ```
 *
 * It flips the input's `type` between `password` and `text` — no value or
 * form wiring, so it drops onto any existing field.
 */
@Component({
  selector: 'lib-password-reveal-button',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      type="button"
      tabindex="-1"
      [attr.aria-label]="revealed() ? 'Hide password' : 'Show password'"
      [attr.aria-pressed]="revealed()"
      (click)="toggle()"
    >
      <mat-icon>{{ revealed() ? 'visibility_off' : 'visibility' }}</mat-icon>
    </button>
  `,
})
export class PasswordRevealButton {
  /** The `<input>` element to toggle — a template reference variable. */
  readonly input = input.required<HTMLInputElement>();

  protected readonly revealed = signal(false);

  constructor() {
    effect(() => {
      this.input().type = this.revealed() ? 'text' : 'password';
    });
  }

  protected toggle(): void {
    this.revealed.update((v) => !v);
  }
}
