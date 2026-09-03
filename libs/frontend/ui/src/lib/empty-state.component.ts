import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * The "nothing here" placeholder: an icon, a headline, a line of context
 * and an optional action slot. Used inside `<lib-data-table>` (its `empty`
 * slot) and on any page whose data set can legitimately be empty.
 *
 * ```html
 * <lib-empty-state icon="group_off" title="No users match">
 *   Try a different search.
 * </lib-empty-state>
 * ```
 */
@Component({
  selector: 'lib-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="empty-state" role="status">
      @if (icon()) {
        <mat-icon class="empty-state__icon" aria-hidden="true">{{ icon() }}</mat-icon>
      }
      <p class="empty-state__title">{{ title() }}</p>
      <p class="empty-state__body"><ng-content /></p>
      <div class="empty-state__action">
        <ng-content select="[action]" />
      </div>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--app-space-2);
      padding: var(--app-space-6) var(--app-space-4);
      text-align: center;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
    }
    .empty-state__icon {
      font-size: 28px;
      inline-size: 28px;
      block-size: 28px;
      opacity: 0.7;
    }
    .empty-state__title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--app-color-on-surface);
    }
    .empty-state__body {
      margin: 0;
      font-size: 0.8125rem;
    }
    .empty-state__body:empty {
      display: none;
    }
    .empty-state__action:empty {
      display: none;
    }
    .empty-state__action {
      margin-block-start: var(--app-space-2);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly icon = input<string>('inbox');
}
