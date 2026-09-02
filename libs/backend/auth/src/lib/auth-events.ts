import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/** Payload of the `user.registered` event. */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  firstName: string;
}

/**
 * A tiny in-process pub/sub for auth lifecycle hooks, built on Node's
 * `EventEmitter` (no extra dependency). The base brick emits; optional
 * bricks such as `auth-reset` subscribe. With nothing subscribed, emitting
 * is a no-op — so the base brick stays independent.
 */
@Injectable()
export class AuthEvents extends EventEmitter {
  emitUserRegistered(payload: UserRegisteredEvent): void {
    this.emit('user.registered', payload);
  }

  onUserRegistered(listener: (event: UserRegisteredEvent) => void): void {
    this.on('user.registered', listener);
  }
}
