import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The bordered `.panel` card every profile section sits in — a titled head
 * with an optional `[panelActions]` slot, and the projected body. Keeps the
 * panel chrome (and its styles) in one place so the sections only carry
 * their own form / list markup.
 */
@Component({
  selector: 'lib-profile-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [class.panel--danger]="danger()">
      <div class="panel__head">
        <h2>{{ heading() }}</h2>
        <ng-content select="[panelActions]" />
      </div>
      <div class="panel__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-md);
    }
    .panel--danger {
      border-color: color-mix(
        in srgb,
        var(--app-color-error) 45%,
        var(--app-color-outline)
      );
    }
    .panel__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--app-space-3);
      padding: var(--app-space-3) var(--app-space-4);
      border-block-end: var(--app-border-hairline);
    }
    .panel__head h2 {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .panel--danger .panel__head h2 {
      color: var(--app-color-error);
    }
    .panel__body {
      padding: var(--app-space-4);
    }
  `,
})
export class ProfilePanel {
  readonly heading = input.required<string>();
  readonly danger = input(false);
}
