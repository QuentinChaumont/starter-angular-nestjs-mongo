import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/** Payload of the `user.email-changed` event. */
export interface UserEmailChangedEvent {
  userId: string;
  /** The new address (already lower-cased / trimmed by the schema). */
  email: string;
  firstName: string;
}

export interface UserRolesChangedEvent {
  userId: string;
  roles: string[];
}

export interface UserStatusChangedEvent {
  userId: string;
  active: boolean;
}

/**
 * In-process pub/sub for user lifecycle hooks, built on Node's
 * `EventEmitter` (no extra dependency) — the same pattern as
 * `@org/backend-auth`'s `AuthEvents`. The `user` feature emits; optional
 * bricks such as `auth-reset` (re-send a verification email on an address
 * change) and `audit` (log role / status changes) subscribe. Nothing
 * subscribed ⇒ emitting is a no-op.
 */
@Injectable()
export class UserEvents extends EventEmitter {
  emitEmailChanged(payload: UserEmailChangedEvent): void {
    this.emit('user.email-changed', payload);
  }
  onEmailChanged(listener: (event: UserEmailChangedEvent) => void): void {
    this.on('user.email-changed', listener);
  }

  emitRolesChanged(payload: UserRolesChangedEvent): void {
    this.emit('user.roles-changed', payload);
  }
  onRolesChanged(listener: (event: UserRolesChangedEvent) => void): void {
    this.on('user.roles-changed', listener);
  }

  emitStatusChanged(payload: UserStatusChangedEvent): void {
    this.emit('user.status-changed', payload);
  }
  onStatusChanged(listener: (event: UserStatusChangedEvent) => void): void {
    this.on('user.status-changed', listener);
  }
}
