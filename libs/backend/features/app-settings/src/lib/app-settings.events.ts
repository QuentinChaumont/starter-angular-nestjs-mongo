import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface SettingsUpdatedEvent {
  /** Id of the admin who made the change, when known. */
  changedBy?: string;
}

/** In-process pub/sub for settings changes — same pattern as `AuthEvents`
 * / `UserEvents`. The `app-settings` brick emits; the `audit` brick
 * subscribes. Nothing subscribed ⇒ emitting is a no-op. */
@Injectable()
export class AppSettingsEvents extends EventEmitter {
  emitUpdated(payload: SettingsUpdatedEvent): void {
    this.emit('settings.updated', payload);
  }
  onUpdated(listener: (event: SettingsUpdatedEvent) => void): void {
    this.on('settings.updated', listener);
  }
}
