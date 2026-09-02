import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ResetService } from './reset.service';

type State = 'pending' | 'ok' | 'error';

@Component({
  selector: 'lib-verify-email-page',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="verify">
      @switch (state()) {
        @case ('pending') {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Verifying your email address…</p>
        }
        @case ('ok') {
          <h1>Email verified</h1>
          <p>Thanks — your email address is confirmed.</p>
          <a mat-flat-button color="primary" routerLink="/app">Continue</a>
        }
        @case ('error') {
          <h1>Verification failed</h1>
          <p>This link is invalid or has expired. Request a new one.</p>
          <a mat-stroked-button routerLink="/app">Back to the app</a>
        }
      }
    </section>
  `,
  styles: `
    .verify {
      max-width: 360px;
      margin: 12vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
      text-align: center;
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
