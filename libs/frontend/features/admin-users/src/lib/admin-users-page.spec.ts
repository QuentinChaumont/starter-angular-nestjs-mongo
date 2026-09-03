import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { UserSummary } from '@org/shared-contracts';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersPage } from './admin-users-page';

const user: UserSummary = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  roles: [],
  emailVerifiedAt: null,
  twoFactorEnabled: false,
  disabledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 5));
    TestBed.tick();
    await fixture.whenStable();
  }
}

describe('AdminUsersPage', () => {
  const list = jest.fn();
  const setRoles = jest.fn();
  const setStatus = jest.fn();
  const roleNames = jest.fn();
  const revokeSessions = jest.fn();
  const dialogOpen = jest.fn();

  function build(): ComponentFixture<AdminUsersPage> {
    list.mockReturnValue(of({ items: [user], total: 1 }));
    setRoles.mockReturnValue(of({ ...user, roles: ['admin'] }));
    roleNames.mockReturnValue(of(['admin', 'editor']));
    dialogOpen.mockReturnValue({ afterClosed: () => of(['admin', 'editor']) });
    TestBed.configureTestingModule({
      imports: [AdminUsersPage],
      providers: [
        {
          provide: AdminUsersService,
          useValue: { list, setRoles, setStatus, roleNames, revokeSessions },
        },
        {
          provide: DialogService,
          useValue: { confirm: () => of(true), open: dialogOpen },
        },
        {
          provide: NotificationService,
          useValue: { success: jest.fn(), error: jest.fn() },
        },
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    list.mockReset();
    setRoles.mockReset();
    setStatus.mockReset();
    roleNames.mockReset();
    revokeSessions.mockReset();
    dialogOpen.mockReset();
  });

  it('loads the user list and renders a row with the unverified tag', async () => {
    const fixture = build();
    await settle(fixture);

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, filters: {} }),
    );
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('ada@example.com');
    expect(text).toContain('unverified');
  });

  it('opens the roles dialog and saves the new selection', async () => {
    const fixture = build();
    await settle(fixture);

    const rolesBtn = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) => b.textContent?.trim() === 'Roles') as
      | HTMLButtonElement
      | undefined;
    rolesBtn?.click();
    await settle(fixture);

    expect(dialogOpen).toHaveBeenCalled();
    // dialog resolved to ['admin', 'editor'] — differs from the user's []
    expect(setRoles).toHaveBeenCalledWith('u1', ['admin', 'editor']);
  });

  it('revokes a user\'s sessions through the confirm dialog', async () => {
    revokeSessions.mockReturnValue(of(undefined));
    const fixture = build();
    await settle(fixture);

    const btn = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) => b.textContent?.trim() === 'Sessions') as
      | HTMLButtonElement
      | undefined;
    btn?.click();
    await settle(fixture);

    expect(revokeSessions).toHaveBeenCalledWith('u1');
  });
});
