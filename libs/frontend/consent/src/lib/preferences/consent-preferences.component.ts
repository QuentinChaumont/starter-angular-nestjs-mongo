import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SESSION_CONTROL } from '@org/frontend-core';
import { ConsentService } from '../consent.service';
import { ConsentDecision } from '../consent.types';

/** Per-category consent toggles. Opened as a dialog from the banner or the
 * "Manage cookies" menu entry. */
@Component({
  selector: 'lib-consent-preferences',
  imports: [MatDialogModule, MatButtonModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Cookie preferences</h2>
    <mat-dialog-content>
      @for (category of categories; track category.id) {
        <div class="pref-row">
          <mat-slide-toggle
            [checked]="draft()[category.id]"
            [disabled]="category.essential === true"
            (change)="set(category.id, $event.checked)"
          >
            {{ category.label }}
          </mat-slide-toggle>
          <p class="pref-row__desc">{{ category.description }}</p>
        </div>
      }

      @if (session && session.isActive()) {
        <div class="pref-row">
          <mat-slide-toggle
            [checked]="sessionOn()"
            (change)="onSessionToggle($event.checked)"
          >
            Session &amp; authentication
          </mat-slide-toggle>
          <p class="pref-row__desc">
            A cookie keeps you signed in on this device. Turning this off clears
            it and signs you out.
          </p>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">
        Save my choices
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .pref-row {
      padding: 12px 0;
      border-bottom: 1px solid var(--app-color-outline);
    }
    .pref-row:last-child {
      border-bottom: none;
    }
    .pref-row__desc {
      margin: 4px 0 0;
      opacity: 0.7;
      font-size: 0.85rem;
    }
  `,
})
export class ConsentPreferences {
  private readonly consent = inject(ConsentService);
  private readonly ref = inject(MatDialogRef);

  /** Present only when the app wired an auth session (optional brick). */
  protected readonly session = inject(SESSION_CONTROL, { optional: true });

  protected readonly categories = this.consent.categories;
  protected readonly draft = signal<ConsentDecision>(
    this.consent.currentDecision(),
  );
  protected readonly sessionOn = signal(true);

  protected set(categoryId: string, value: boolean): void {
    this.draft.update((current) => ({ ...current, [categoryId]: value }));
  }

  protected onSessionToggle(checked: boolean): void {
    if (checked || !this.session) {
      return;
    }
    this.session.end().subscribe((endedSession) => {
      if (endedSession) {
        this.ref.close(true);
      } else {
        // cancelled — put the toggle back
        this.sessionOn.set(true);
      }
    });
  }

  protected save(): void {
    this.consent.save(this.draft());
    this.ref.close(true);
  }

  protected close(): void {
    this.ref.close(false);
  }
}
