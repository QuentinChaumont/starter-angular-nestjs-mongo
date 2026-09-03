import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Copies `[value]` to the clipboard and flips to a "Copied" state for a
 * couple of seconds. Used for the backup codes on the 2FA panel and any
 * other opaque string a user needs to keep.
 *
 * ```html
 * <lib-copy-button [value]="code" label="Copy code" />
 * ```
 */
@Component({
  selector: 'lib-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="copied() ? 'Copied' : label()"
      (click)="copy()"
    >
      <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
    </button>
  `,
  styles: `
    button {
      --mdc-icon-button-icon-size: 16px;
      inline-size: 32px;
      block-size: 32px;
      padding: 8px;
    }
  `,
})
export class CopyButton {
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly value = input.required<string>();
  readonly label = input('Copy');

  protected readonly copied = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.timer !== null) clearTimeout(this.timer);
    });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(this.value());
      this.copied.set(true);
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // clipboard blocked (insecure context / permissions) — no-op
    }
  }
}
