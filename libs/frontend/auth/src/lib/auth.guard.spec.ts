import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, isObservable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard, roleGuard } from './auth.guard';
import { AuthStore } from './auth.store';

@Injectable()
class FakeAuthService {
  restore = true;
  silentRefresh(): Observable<boolean> {
    return of(this.restore);
  }
}

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/app/reports' } as RouterStateSnapshot;

function run(guard: CanActivateFn): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() => guard(route, state));
  return Promise.resolve(
    isObservable(result)
      ? firstValue(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree),
  );
}

function firstValue<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

describe('auth guards', () => {
  let store: AuthStore;
  let auth: FakeAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService },
      ],
    });
    store = TestBed.inject(AuthStore);
    auth = TestBed.inject(AuthService) as unknown as FakeAuthService;
  });

  describe('authGuard', () => {
    it('lets an authenticated user through', async () => {
      store.setSession('t', { id: 'u1', roles: [] });
      expect(await run(authGuard)).toBe(true);
    });

    it('allows through after a successful silent refresh', async () => {
      auth.restore = true;
      expect(await run(authGuard)).toBe(true);
    });

    it('redirects to /login with redirectTo when the refresh fails', async () => {
      auth.restore = false;
      const result = await run(authGuard);
      expect(result).toBeInstanceOf(UrlTree);
      expect((result as UrlTree).toString()).toBe(
        '/login?redirectTo=%2Fapp%2Freports',
      );
    });
  });

  describe('roleGuard', () => {
    it('allows a user holding one of the roles', async () => {
      store.setSession('t', { id: 'u1', roles: ['editor', 'admin'] });
      expect(await run(roleGuard('admin'))).toBe(true);
    });

    it('sends a wrong-role user home', async () => {
      store.setSession('t', { id: 'u1', roles: ['viewer'] });
      const result = await run(roleGuard('admin'));
      expect(result).toBeInstanceOf(UrlTree);
      expect((result as UrlTree).toString()).toBe('/');
    });

    it('redirects an anonymous user to /login', async () => {
      auth.restore = false;
      const result = await run(roleGuard('admin'));
      expect(result).toBeInstanceOf(UrlTree);
      expect((result as UrlTree).toString()).toContain('/login');
    });
  });
});
