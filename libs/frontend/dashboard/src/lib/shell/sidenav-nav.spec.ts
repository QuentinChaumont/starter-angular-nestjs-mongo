import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@org/frontend-auth';
import { DASHBOARD_NAV, NavItem } from '../nav.tokens';
import { provideTranslocoTesting } from '@org/frontend-i18n';
import { SidenavNav } from './sidenav-nav';

@Component({ template: '' })
class Blank {}

const NAV: NavItem[] = [
  { label: 'Home', icon: 'home', route: '' },
  { label: 'Reports', icon: 'bar_chart', route: 'reports' },
  { label: 'Admin', icon: 'shield', route: 'admin', roles: ['admin'] },
];

function render(nav: NavItem[] = NAV) {
  TestBed.configureTestingModule({
    imports: [SidenavNav],
    providers: [
      provideRouter([{ path: '**', component: Blank }]),
      provideTranslocoTesting(),
      { provide: DASHBOARD_NAV, useValue: nav },
    ],
  });
  const fixture = TestBed.createComponent(SidenavNav);
  fixture.detectChanges();
  return fixture;
}

function labels(fixture: ReturnType<typeof render>): string[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('[matListItemTitle]'),
  ).map((el) => el.textContent?.trim() ?? '');
}

describe('SidenavNav', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides role-gated entries from a user without the role', () => {
    const fixture = render();
    expect(labels(fixture)).toEqual(['Home', 'Reports']);
  });

  it('shows role-gated entries to a user holding the role', () => {
    const fixture = render();
    TestBed.inject(AuthStore).setSession('t', { id: 'u1', roles: ['admin'] });
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['Home', 'Reports', 'Admin']);
  });

  it('emits navigated when a link is clicked', () => {
    const fixture = render();
    const emitted = jest.fn();
    fixture.componentInstance.navigated.subscribe(emitted);

    (fixture.nativeElement as HTMLElement)
      .querySelector('a[mat-list-item]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toHaveBeenCalled();
  });
});

const NESTED_NAV: NavItem[] = [
  { label: 'Home', icon: 'home', route: '' },
  {
    label: 'Admin',
    icon: 'shield',
    roles: ['admin'],
    children: [
      { label: 'Users', icon: 'group', route: 'admin' },
      { label: 'Roles', icon: 'badge', route: 'admin/roles' },
    ],
  },
];

describe('SidenavNav — nested groups', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the whole group, children included, from a user without its role', () => {
    const fixture = render(NESTED_NAV);
    expect(labels(fixture)).toEqual(['Home']);
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });

  it('renders a group header but no children until expanded, for a user holding the role', () => {
    const fixture = render(NESTED_NAV);
    TestBed.inject(AuthStore).setSession('t', { id: 'u1', roles: ['admin'] });
    fixture.detectChanges();

    expect(labels(fixture)).toEqual(['Home', 'Admin']);
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.nav-tree__group')).toBeNull();
  });
});
