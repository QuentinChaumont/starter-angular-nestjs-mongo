import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService, AppLogger } from '@org/backend-core';
import {
  MailerService,
  renderEmailVerification,
  renderPasswordReset,
} from '@org/backend-mailer';
import { UserService } from '@org/backend-features-user';
import { AuthEvents } from '@org/backend-auth';
import { RefreshTokenService } from '@org/backend-auth';
import { EmailVerificationService } from '../verification/email-verification.service';
import { PasswordResetService } from './password-reset.service';

/**
 * Orchestrates the "forgot password" and "verify email" flows: token
 * issuance, the outgoing mail, and — on a successful reset — burning every
 * session. Kept together in one service because the two flows share the
 * same collaborators and the same "never leak whether an account exists"
 * rule.
 */
@Injectable()
export class AuthResetService implements OnModuleInit {
  constructor(
    private readonly users: UserService,
    private readonly passwordReset: PasswordResetService,
    private readonly emailVerification: EmailVerificationService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly mailer: MailerService,
    private readonly config: AppConfigService,
    private readonly events: AuthEvents,
    private readonly logger: AppLogger,
  ) {}

  /** Subscribe to registration so a verification email goes out on sign-up.
   * A failure here must not break the registration response. */
  onModuleInit(): void {
    this.events.onUserRegistered((event) => {
      this.sendVerificationEmail(event).catch((error: unknown) => {
        this.logger.error(
          `Failed to send verification email: ${
            error instanceof Error ? error.message : String(error)
          }`,
          undefined,
          'AuthResetService',
        );
      });
    });
  }

  /**
   * Always resolves the same way (and in roughly the same time) whether or
   * not `email` matches an account — no enumeration. The controller answers
   * `202` regardless.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }

    const token = await this.passwordReset.issue(user._id.toString());
    const url = this.link('/reset-password', token);
    await this.mailer.send({
      to: user.email,
      ...renderPasswordReset({
        url,
        expiresInMinutes: this.passwordReset.ttlMinutes,
      }),
    });
    this.logLink('password-reset', user.email, url);
  }

  /** Consumes the token, sets the new password, and revokes every session
   * (including any outstanding reset links). `400` if the token is bad. */
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.passwordReset.consume(token);
    await this.users.updateById(userId, { password });
    await this.passwordReset.invalidateAllForUser(userId);
    await this.refreshTokens.revokeAllForUser(userId);
  }

  /** Fire-and-forget from the `user.registered` event and the resend route. */
  async sendVerificationEmail(user: {
    userId: string;
    email: string;
  }): Promise<void> {
    const token = await this.emailVerification.issue(user.userId);
    const url = this.link('/verify-email', token);
    await this.mailer.send({
      to: user.email,
      ...renderEmailVerification({ url }),
    });
    this.logLink('email-verification', user.email, url);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.emailVerification.consume(token);
    await this.users.markEmailVerified(userId);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (user.emailVerifiedAt) {
      return;
    }
    await this.emailVerification.invalidateAllForUser(userId);
    await this.sendVerificationEmail({ userId, email: user.email });
  }

  private link(path: string, token: string): string {
    const base = this.config.http.corsOrigins[0].replace(/\/$/, '');
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }

  /**
   * With no `SMTP_URL`, mail is only logged / dumped to `.eml` — so surface
   * the link on its own line too, so a local flow is never blocked waiting
   * for an inbox. Silent once real SMTP delivery is configured.
   */
  private logLink(kind: string, to: string, url: string): void {
    if (this.config.mailer.smtpUrl) {
      return;
    }
    this.logger.warn(
      `Mailer has no SMTP_URL — the ${kind} email for ${to} was not delivered. Open the link directly: ${url}`,
      'AuthResetService',
    );
  }
}
