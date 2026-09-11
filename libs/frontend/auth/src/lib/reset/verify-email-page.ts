import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../auth.service';
import { ResetService } from './reset.service';
import { AuthShell } from '../ui/auth-shell';

type State = 'pending' | 'ok' | 'error';

@Component({
  selector: 'lib-verify-email-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    AuthShell,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-auth-shell class="verify">
      @switch (state()) {
        @case ('pending') {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>{{ 'auth.verify.checking' | transloco }}</p>
        }
        @case ('ok') {
          <h1>{{ 'auth.verify.okTitle' | transloco }}</h1>
          <p>{{ 'auth.verify.okBody' | transloco }}</p>
          <a mat-flat-button color="primary" routerLink="/app">
            {{ 'auth.verify.goToApp' | transloco }}
          </a>
        }
        @case ('error') {
          <h1>{{ 'auth.verify.failedTitle' | transloco }}</h1>
          <p>{{ 'auth.verify.failedBody' | transloco }}</p>
          <a mat-stroked-button routerLink="/app">
            {{ 'auth.verify.backToApp' | transloco }}
          </a>
        }
      }
    </lib-auth-shell>
  `,
  styles: `
    .verify {
      text-align: center;
    }
    .verify h1 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .verify mat-progress-bar {
      margin-block: var(--app-space-2);
    }
  `,
})
export class VerifyEmailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly reset = inject(ResetService);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<State>('pending');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      return;
    }
    this.reset.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('ok');
        // Refresh `emailVerifiedAt` so the banner clears if a session is open.
        this.auth.loadMe().subscribe({ error: () => undefined });
      },
      error: () => this.state.set('error'),
    });
  }
}
