import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isApiError } from '@org/shared-contracts';
import { NotificationService } from '@org/frontend-feedback';
import { AsyncButtonDirective, FormErrors, PageHeader } from '@org/frontend-ui';
import { AdminSettingsService } from './admin-settings.service';

/** `{ integer: true }` when the control holds a non-integer number. */
function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(value) ? null : { integer: true };
}

/** `{ warningTooLarge: true }` when a warning would fire on/after deletion. */
function warningWindowValidator(
  group: AbstractControl,
): ValidationErrors | null {
  const inactiveDays = group.get('inactiveDays')?.value;
  const warningDays = group.get('warningDays')?.value;
  if (inactiveDays === null || warningDays === null) {
    return null;
  }
  return warningDays >= inactiveDays ? { warningTooLarge: true } : null;
}

@Component({
  selector: 'lib-admin-settings-page',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncButtonDirective,
    FormErrors,
    PageHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-settings">
      <lib-page-header
        title="Settings"
        subtitle="How long dormant accounts are kept before they are deleted."
      />

      <form class="panel" [formGroup]="form" (ngSubmit)="submit()">
        <div class="panel__body">
          <p class="admin-settings__intro">
            An account with no activity for this many days is deleted, after an
            optional heads-up email. Leave a field blank to turn that step off.
          </p>

          <mat-form-field appearance="outline">
            <mat-label>Delete after (days inactive)</mat-label>
            <input
              matInput
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              formControlName="inactiveDays"
            />
            <mat-hint>
              Leave blank to never auto-delete inactive accounts.
            </mat-hint>
          </mat-form-field>
          <lib-form-errors [control]="form.controls.inactiveDays" />

          <mat-form-field appearance="outline">
            <mat-label>Warn this many days before</mat-label>
            <input
              matInput
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              formControlName="warningDays"
            />
            <mat-hint>
              Leave blank to delete without a warning email.
            </mat-hint>
          </mat-form-field>
          <lib-form-errors [control]="form.controls.warningDays" />

          @if (form.errors?.['warningTooLarge'] && form.touched) {
            <p class="admin-settings__error" role="alert">
              The warning must be sent before the account is deleted — use fewer
              warning days than inactive days.
            </p>
          }
          @if (serverError(); as message) {
            <p class="admin-settings__error" role="alert">{{ message }}</p>
          }

          <div class="admin-settings__actions">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [libAsyncButton]="saving()"
              [busyDisabled]="form.invalid"
            >
              Save changes
            </button>
          </div>
        </div>
      </form>
    </section>
  `,
  styles: `
    .admin-settings {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 640px;
    }
    .panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-md);
    }
    .panel__body {
      padding: var(--app-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--app-space-3);
    }
    .admin-settings__intro {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
    }
    .admin-settings mat-form-field {
      width: 100%;
    }
    .admin-settings__error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--app-color-error);
    }
    .admin-settings__actions {
      display: flex;
      margin-block-start: 2px;
    }
  `,
})
export class AdminSettingsPage {
  private readonly service = inject(AdminSettingsService);
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = new FormGroup(
    {
      inactiveDays: new FormControl<number | null>(null, [
        Validators.min(1),
        integerValidator,
      ]),
      warningDays: new FormControl<number | null>(null, [
        Validators.min(1),
        integerValidator,
      ]),
    },
    { validators: warningWindowValidator },
  );

  constructor() {
    this.service
      .load()
      .pipe(takeUntilDestroyed())
      .subscribe((settings) => {
        this.form.setValue({
          inactiveDays: settings.accountRetention.inactiveDays,
          warningDays: settings.accountRetention.warningDays,
        });
      });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const patch = {
      accountRetention: {
        inactiveDays: value.inactiveDays ?? null,
        warningDays: value.warningDays ?? null,
      },
    };

    this.saving.set(true);
    this.serverError.set(null);
    this.service.save(patch).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify?.success('Retention settings saved.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const body = err instanceof HttpErrorResponse ? err.error : null;
        if (isApiError(body) && body.code === 'INVALID_SETTINGS') {
          this.form.setErrors({ ...this.form.errors, warningTooLarge: true });
          this.serverError.set(body.message);
          return;
        }
        this.serverError.set(
          isApiError(body) ? body.message : 'Could not save the settings.',
        );
      },
    });
  }
}
