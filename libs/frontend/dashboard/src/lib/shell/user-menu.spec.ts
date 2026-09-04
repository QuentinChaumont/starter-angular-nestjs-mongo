import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, AuthStore } from '@org/frontend-auth';
import { of } from 'rxjs';
import { provideTranslocoTesting } from '@org/frontend-i18n';
import { UserMenu } from './user-menu';

interface MenuInternals {
  roleLabel(): string;
  openTheme(): void;
  signOut(): void;
}

describe('UserMenu', () => {
  const navigate = jest.fn();
  const logout = jest.fn(() => of(undefined));
  const dialogOpen = jest.fn();

  function build(): MenuInternals {
    navigate.mockReset();
    logout.mockClear();
    dialogOpen.mockReset();
    TestBed.configureTestingModule({
      imports: [UserMenu],
      providers: [
        provideTranslocoTesting(),
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { logout } },
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    });
    const fixture = TestBed.createComponent(UserMenu);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as MenuInternals;
  }

  it('labels the menu with the user roles, else "Signed in"', () => {
    const menu = build();
    expect(menu.roleLabel()).toBe('Signed in');
    TestBed.inject(AuthStore).setSession('t', { id: 'u1', roles: ['admin'] });
    expect(menu.roleLabel()).toBe('admin');
  });

  it('opens the theme panel in a dialog', async () => {
    build().openTheme();
    // the panel component is lazily imported — let the microtask settle
    await new Promise((r) => setTimeout(r, 10));
    expect(dialogOpen).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: '320px' }),
    );
  });

  it('signs out then routes to /login', () => {
    build().signOut();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
