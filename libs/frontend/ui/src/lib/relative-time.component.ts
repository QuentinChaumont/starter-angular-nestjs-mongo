import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * One shared clock for every `<lib-relative-time>` on the page — a single
 * `setInterval`, not one per instance. Ticks once a minute; the interval
 * only runs while at least one component is mounted.
 */
@Injectable({ providedIn: 'root' })
export class RelativeTimeClock implements OnDestroy {
  private readonly _now = signal(Date.now());
  private handle: ReturnType<typeof setInterval> | null = null;
  private subscribers = 0;

  readonly now = this._now.asReadonly();

  acquire(): void {
    this.subscribers += 1;
    if (this.handle === null) {
      this.handle = setInterval(() => this._now.set(Date.now()), 60_000);
    }
  }

  release(): void {
    this.subscribers = Math.max(0, this.subscribers - 1);
    if (this.subscribers === 0 && this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }

  ngOnDestroy(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
    }
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Renders an ISO timestamp as "just now" / "3 min ago" / "2 h ago" /
 * "5 d ago", falling back to an absolute date past a week. The full date is
 * always in the `title` for hover. Used by the audit log, the sessions
 * list, the profile and the user console.
 *
 * ```html
 * <lib-relative-time [value]="row.createdAt" />
 * ```
 */
@Component({
  selector: 'lib-relative-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `<time [attr.datetime]="value()" [attr.title]="value() | date: 'medium'">{{
    label()
  }}</time>`,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RelativeTime implements OnDestroy {
  private readonly clock = inject(RelativeTimeClock);

  readonly value = input.required<string | number | Date | null | undefined>();

  constructor() {
    this.clock.acquire();
  }

  ngOnDestroy(): void {
    this.clock.release();
  }

  protected readonly label = computed(() => {
    const raw = this.value();
    if (raw === null || raw === undefined || raw === '') {
      return '—';
    }
    const then = new Date(raw).getTime();
    if (Number.isNaN(then)) {
      return '—';
    }
    const diff = this.clock.now() - then;
    if (diff < 0) {
      return 'just now';
    }
    if (diff < MINUTE) {
      return 'just now';
    }
    if (diff < HOUR) {
      return `${Math.floor(diff / MINUTE)} min ago`;
    }
    if (diff < DAY) {
      return `${Math.floor(diff / HOUR)} h ago`;
    }
    if (diff < 7 * DAY) {
      return `${Math.floor(diff / DAY)} d ago`;
    }
    return new Date(then).toLocaleDateString();
  });
}
