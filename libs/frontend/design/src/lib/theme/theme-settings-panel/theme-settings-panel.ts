import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { designConfig } from '../design.config';
import { ThemeService } from '../theme.service';
import {
  THEME_MODES,
  THEME_TOKEN_LABEL,
  THEME_TOKENS,
  ThemeMode,
  ThemeToken,
} from '../theme.tokens';

/**
 * Drop-in panel to retint the app at runtime. Reads/writes {@link
 * ThemeService}; every change is visible immediately and persisted. It
 * only knows the design brick — the dashboard (step 26) mounts it in the
 * user menu, but nothing here depends on the dashboard.
 */
@Component({
  selector: 'lib-theme-settings-panel',
  imports: [MatButtonToggleModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="theme-panel">
      <h3 class="theme-panel__heading">Appearance</h3>
      <mat-button-toggle-group
        [value]="mode()"
        (change)="onMode($event.value)"
        aria-label="Colour scheme"
      >
        @for (option of modes; track option) {
          <mat-button-toggle [value]="option">{{ option }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      <h3 class="theme-panel__heading">Colours</h3>
      @for (token of tokens; track token) {
        <div class="theme-panel__row">
          <label [attr.for]="'theme-color-' + token">{{ labels[token] }}</label>
          <input
            type="color"
            [id]="'theme-color-' + token"
            [value]="colorFor(token)"
            (input)="onColor(token, $event)"
          />
          @if (overrides()[token]) {
            <button
              mat-icon-button
              type="button"
              (click)="onResetColor(token)"
              [attr.aria-label]="'Reset ' + labels[token]"
            >
              <mat-icon>undo</mat-icon>
            </button>
          }
        </div>
      }

      <button mat-stroked-button type="button" (click)="onResetAll()">
        Reset to defaults
      </button>
    </section>
  `,
  styles: `
    .theme-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      min-width: 240px;
    }
    .theme-panel__heading {
      margin: 4px 0 0;
      font: 600 0.6875rem/1 var(--app-font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: color-mix(in srgb, var(--app-color-on-surface) 50%, transparent);
    }
    .theme-panel__row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .theme-panel__row label {
      flex: 1;
    }
    .theme-panel__row input[type='color'] {
      inline-size: 40px;
      block-size: 28px;
      padding: 0;
      border: 1px solid var(--app-color-outline);
      border-radius: var(--app-radius-sm);
      background: none;
    }
  `,
})
export class ThemeSettingsPanel {
  private readonly theme = inject(ThemeService);

  protected readonly modes = THEME_MODES;
  protected readonly tokens = THEME_TOKENS;
  protected readonly labels = THEME_TOKEN_LABEL;
  protected readonly mode = this.theme.mode;
  protected readonly overrides = this.theme.overrides;

  protected colorFor(token: ThemeToken): string {
    return this.overrides()[token] ?? designConfig.colors[token];
  }

  protected onMode(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  protected onColor(token: ThemeToken, event: Event): void {
    this.theme.setColor(token, (event.target as HTMLInputElement).value);
  }

  protected onResetColor(token: ThemeToken): void {
    this.theme.resetColor(token);
  }

  protected onResetAll(): void {
    this.theme.resetAll();
  }
}
