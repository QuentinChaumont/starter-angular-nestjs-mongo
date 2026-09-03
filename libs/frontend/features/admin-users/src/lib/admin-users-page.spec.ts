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

  function build(): ComponentFixture<AdminUsersPage> {
    list.mockReturnValue(of({ items: [user], total: 1 }));
    setRoles.mockReturnValue(of({ ...user, roles: ['admin'] }));
    TestBed.configureTestingModule({
      imports: [AdminUsersPage],
      providers: [
        { provide: AdminUsersService, useValue: { list, setRoles, setStatus } },
        { provide: DialogService, useValue: { confirm: () => of(true) } },
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

  it('grants admin through the confirm dialog', async () => {
    const fixture = build();
    await settle(fixture);

    const grant = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.includes('Grant admin'),
    ) as HTMLButtonElement;
    grant.click();
    await settle(fixture);

    expect(setRoles).toHaveBeenCalledWith('u1', ['admin']);
  });
});
