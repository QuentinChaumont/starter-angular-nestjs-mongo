import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/** Payload of the `user.email-changed` event. */
export interface UserEmailChangedEvent {
  userId: string;
  /** The new address (already lower-cased / trimmed by the schema). */
  email: string;
  firstName: string;
}

/**
 * In-process pub/sub for user lifecycle hooks, built on Node's
 * `EventEmitter` (no extra dependency) — the same pattern as
 * `@org/backend-auth`'s `AuthEvents`. The `user` feature emits; optional
 * bricks such as `auth-reset` subscribe (it re-sends a verification email
 * when the address changes). Nothing subscribed ⇒ emitting is a no-op.
 */
@Injectable()
export class UserEvents extends EventEmitter {
  emitEmailChanged(payload: UserEmailChangedEvent): void {
    this.emit('user.email-changed', payload);
  }

  onEmailChanged(listener: (event: UserEmailChangedEvent) => void): void {
    this.on('user.email-changed', listener);
  }
}
