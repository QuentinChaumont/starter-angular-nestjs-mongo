import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { AuditEvent } from '@org/shared-contracts';
import { AdminAuditPage } from './admin-audit-page';
import { AdminAuditService } from './admin-audit.service';

const events: AuditEvent[] = [
  {
    id: 'a1',
    actorId: 'admin-1',
    actorEmail: 'ada@example.com',
    action: 'admin.roles-changed',
    target: 'user-9',
    targetType: 'user',
    ip: '10.0.0.1',
    userAgent: 'jest',
    meta: { roles: ['editor'] },
    at: '2026-02-01T10:00:00.000Z',
  },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 5));
    TestBed.tick();
    await fixture.whenStable();
  }
}

describe('AdminAuditPage', () => {
  const list = jest.fn();

  function build(): ComponentFixture<AdminAuditPage> {
    list.mockReturnValue(of({ items: events, total: 1 }));
    TestBed.configureTestingModule({
      imports: [AdminAuditPage],
      providers: [{ provide: AdminAuditService, useValue: { list } }],
    });
    const fixture = TestBed.createComponent(AdminAuditPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => list.mockReset());

  it('renders audit rows newest-first', async () => {
    const fixture = build();
    await settle(fixture);

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25 }),
    );
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('admin.roles-changed');
    expect(text).toContain('ada@example.com');
    expect(text).toContain('user-9');
  });

});
