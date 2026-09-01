import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@org/frontend-auth';
import { DASHBOARD_NAV, NavItem } from '../nav.tokens';
import { SidenavNav } from './sidenav-nav';

const NAV: NavItem[] = [
  { label: 'Home', icon: 'home', route: '' },
  { label: 'Reports', icon: 'bar_chart', route: 'reports' },
  { label: 'Admin', icon: 'shield', route: 'admin', roles: ['admin'] },
];

function render() {
  TestBed.configureTestingModule({
    imports: [SidenavNav],
    providers: [provideRouter([]), { provide: DASHBOARD_NAV, useValue: NAV }],
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
