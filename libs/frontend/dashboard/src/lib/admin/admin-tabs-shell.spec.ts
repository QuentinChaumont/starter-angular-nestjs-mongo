import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '@org/frontend-i18n';
import { AdminTabsShell } from './admin-tabs-shell';
import { ADMIN_TABS, AdminTab } from './admin-tabs.tokens';

@Component({ template: '' })
class Blank {}

function render(tabs: AdminTab[]) {
  TestBed.configureTestingModule({
    imports: [AdminTabsShell],
    providers: [
      provideRouter([{ path: '**', component: Blank }]),
      provideTranslocoTesting(),
      ...tabs.map((tab) => ({ provide: ADMIN_TABS, multi: true, useValue: tab })),
    ],
  });
  const fixture = TestBed.createComponent(AdminTabsShell);
  fixture.detectChanges();
  return fixture;
}

function tabLabels(fixture: ReturnType<typeof render>): string[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('.admin-tabs__tab'),
  ).map((a) => a.textContent?.trim() ?? '');
}

describe('AdminTabsShell', () => {
  it('renders one tab per ADMIN_TABS entry, sorted by order', () => {
    const fixture = render([
      { label: 'Audit', path: 'audit', order: 20 },
      { label: 'Users', path: '', order: 0 },
      { label: 'Roles', path: 'roles', order: 10 },
    ]);
    expect(tabLabels(fixture)).toEqual(['Users', 'Roles', 'Audit']);
  });

  it('hides the tab bar when only one console is installed', () => {
    const fixture = render([{ label: 'Users', path: '', order: 0 }]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.admin-tabs'),
    ).toBeNull();
    // the outlet is still there
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('router-outlet'),
    ).not.toBeNull();
  });
});
