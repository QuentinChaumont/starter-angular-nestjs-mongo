import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';

const USER = { id: 'u1', roles: ['admin'] };

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = TestBed.inject(AuthStore);
  });

  it('starts anonymous with no token or user', () => {
    expect(store.status()).toBe('anonymous');
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('setSession authenticates with a token + user', () => {
    store.setSession('access-1', USER);

    expect(store.status()).toBe('authenticated');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('access-1');
    expect(store.user()).toEqual(USER);
  });

  it('setAccessToken swaps the token without dropping the user', () => {
    store.setSession('access-1', USER);
    store.setAccessToken('access-2');

    expect(store.token()).toBe('access-2');
    expect(store.user()).toEqual(USER);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('reset clears everything back to anonymous', () => {
    store.setSession('access-1', USER);
    store.reset();

    expect(store.status()).toBe('anonymous');
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
  });
});
