import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** Visual weight of a {@link StatusBadge}. */
export type StatusTone = 'neutral' | 'success' | 'warn' | 'danger';

/**
 * A small monospace pill for a row/record status — "unverified", "system",
 * "Disabled", "On"/"Off". Replaces the per-page `.*__tag` / `.*__status`
 * classes. The label is projected, so callers keep control of the text
 * (and its translation).
 *
 * ```html
 * <lib-status-badge tone="warn">unverified</lib-status-badge>
 * ```
 */
@Component({
  selector: 'lib-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: var(--app-radius-sm);
      border: 1px solid currentColor;
      font: 500 0.6875rem/1.5 var(--app-font-mono);
      letter-spacing: 0.02em;
      white-space: nowrap;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
    }
    :host(.status-badge--success) {
      color: color-mix(
        in srgb,
        var(--app-color-primary) 85%,
        var(--app-color-on-surface)
      );
    }
    :host(.status-badge--danger) {
      color: var(--app-color-error);
    }
  `,
})
export class StatusBadge {
  readonly tone = input<StatusTone>('neutral');
  protected readonly hostClass = computed(
    () => `status-badge status-badge--${this.tone()}`,
  );
}
