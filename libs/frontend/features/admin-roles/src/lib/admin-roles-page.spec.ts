import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { Role } from '@org/shared-contracts';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { AdminRolesPage } from './admin-roles-page';
import { AdminRolesService } from './admin-roles.service';

const roles: Role[] = [
  {
    id: 'r1',
    name: 'admin',
    description: null,
    system: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'r2',
    name: 'editor',
    description: 'Publishes',
    system: false,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 5));
    TestBed.tick();
    await fixture.whenStable();
  }
}

describe('AdminRolesPage', () => {
  const list = jest.fn();
  const create = jest.fn();
  const remove = jest.fn();
  const dialogOpen = jest.fn();
  const confirm = jest.fn();
  const notify = { success: jest.fn(), error: jest.fn() };

  function build(): ComponentFixture<AdminRolesPage> {
    list.mockReturnValue(of({ items: roles, total: 2 }));
    TestBed.configureTestingModule({
      imports: [AdminRolesPage],
      providers: [
        {
          provide: AdminRolesService,
          useValue: { list, create, update: jest.fn(), remove },
        },
        {
          provide: DialogService,
          useValue: { open: dialogOpen, confirm },
        },
        { provide: NotificationService, useValue: notify },
      ],
    });
    const fixture = TestBed.createComponent(AdminRolesPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    remove.mockReset();
    dialogOpen.mockReset();
    confirm.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
  });

  it('lists roles and tags the system one', async () => {
    const fixture = build();
    await settle(fixture);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('admin');
    expect(text).toContain('editor');
    expect(text).toContain('system');
  });

  it('creates a role through the form dialog', async () => {
    dialogOpen.mockReturnValue({
      afterClosed: () => of({ name: 'auditor', description: '' }),
    });
    create.mockReturnValue(of(roles[1]));

    const fixture = build();
    await settle(fixture);

    const newBtn = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) => b.textContent?.includes('New role')) as
      | HTMLButtonElement
      | undefined;
    newBtn?.click();
    await settle(fixture);

    expect(create).toHaveBeenCalledWith({ name: 'auditor', description: '' });
    expect(notify.success).toHaveBeenCalledWith('Role created.');
  });

  it('deletes a non-system role after confirmation', async () => {
    confirm.mockReturnValue(of(true));
    remove.mockReturnValue(of(undefined));

    const fixture = build();
    await settle(fixture);

    const buttons = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ] as HTMLButtonElement[];
    // admin (system) row's Delete is disabled; editor's is enabled
    expect(
      buttons.some((b) => b.textContent?.trim() === 'Delete' && b.disabled),
    ).toBe(true);
    const delBtn = buttons.find(
      (b) => b.textContent?.trim() === 'Delete' && !b.disabled,
    ) as HTMLButtonElement;
    delBtn.click();
    await settle(fixture);

    expect(remove).toHaveBeenCalledWith('r2');
  });
});
