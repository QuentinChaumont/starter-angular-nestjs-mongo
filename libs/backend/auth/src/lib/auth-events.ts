import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/** Payload of the `user.registered` event. */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  firstName: string;
}

export interface LoginSucceededEvent {
  userId: string;
  ip?: string;
  userAgent?: string;
  /** `password` | `oidc:<provider>` | `2fa`. */
  method: string;
}

export interface LoginFailedEvent {
  email: string;
  ip?: string;
  userAgent?: string;
  /** e.g. `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `EMAIL_NOT_VERIFIED`. */
  reason: string;
}

export interface AccountSecurityEvent {
  userId: string;
}

export interface TokenReusedEvent {
  userId: string;
  familyId: string;
}

export interface IdentityLinkEvent {
  userId: string;
  provider: string;
}

/**
 * A tiny in-process pub/sub for auth lifecycle hooks, built on Node's
 * `EventEmitter` (no extra dependency). The base brick emits; optional
 * bricks such as `auth-reset` (verification mail) and `audit` (log)
 * subscribe. With nothing subscribed, emitting is a no-op — so the base
 * brick stays independent.
 */
@Injectable()
export class AuthEvents extends EventEmitter {
  emitUserRegistered(payload: UserRegisteredEvent): void {
    this.emit('user.registered', payload);
  }
  onUserRegistered(listener: (event: UserRegisteredEvent) => void): void {
    this.on('user.registered', listener);
  }

  emitLoginSucceeded(payload: LoginSucceededEvent): void {
    this.emit('auth.login-succeeded', payload);
  }
  onLoginSucceeded(listener: (event: LoginSucceededEvent) => void): void {
    this.on('auth.login-succeeded', listener);
  }

  emitLoginFailed(payload: LoginFailedEvent): void {
    this.emit('auth.login-failed', payload);
  }
  onLoginFailed(listener: (event: LoginFailedEvent) => void): void {
    this.on('auth.login-failed', listener);
  }

  emitPasswordChanged(payload: AccountSecurityEvent): void {
    this.emit('auth.password-changed', payload);
  }
  onPasswordChanged(listener: (event: AccountSecurityEvent) => void): void {
    this.on('auth.password-changed', listener);
  }

  emitTwoFactorEnabled(payload: AccountSecurityEvent): void {
    this.emit('auth.2fa-enabled', payload);
  }
  onTwoFactorEnabled(listener: (event: AccountSecurityEvent) => void): void {
    this.on('auth.2fa-enabled', listener);
  }

  emitTwoFactorDisabled(payload: AccountSecurityEvent): void {
    this.emit('auth.2fa-disabled', payload);
  }
  onTwoFactorDisabled(listener: (event: AccountSecurityEvent) => void): void {
    this.on('auth.2fa-disabled', listener);
  }

  emitTokenReused(payload: TokenReusedEvent): void {
    this.emit('auth.token-reused', payload);
  }
  onTokenReused(listener: (event: TokenReusedEvent) => void): void {
    this.on('auth.token-reused', listener);
  }

  emitIdentityLinked(payload: IdentityLinkEvent): void {
    this.emit('auth.identity-linked', payload);
  }
  onIdentityLinked(listener: (event: IdentityLinkEvent) => void): void {
    this.on('auth.identity-linked', listener);
  }

  emitIdentityUnlinked(payload: IdentityLinkEvent): void {
    this.emit('auth.identity-unlinked', payload);
  }
  onIdentityUnlinked(listener: (event: IdentityLinkEvent) => void): void {
    this.on('auth.identity-unlinked', listener);
  }
}
