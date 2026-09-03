import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** The authenticated caller, once a guard/interceptor has resolved it. */
export interface RequestActor {
  id: string;
  ip?: string;
  userAgent?: string;
}

export interface RequestStore {
  requestId: string;
  actor?: RequestActor;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  run<T>(store: RequestStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  get requestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  /**
   * Set once per request, after authentication has run (see the auth
   * brick's `RequestActorInterceptor`). Read by cross-cutting concerns
   * such as the audit log to attribute an action without threading the
   * caller through every service signature.
   */
  setActor(actor: RequestActor): void {
    const store = this.storage.getStore();
    if (store) {
      store.actor = actor;
    }
  }

  get actor(): RequestActor | undefined {
    return this.storage.getStore()?.actor;
  }
}
