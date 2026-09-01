import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DASHBOARD_NAV } from '../nav.tokens';
import { DashboardShell } from './dashboard-shell';

interface ShellInternals {
  compact(): boolean;
  opened(): boolean;
  toggle(): void;
}

describe('DashboardShell', () => {
  const matches$ = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
  });

  function build(): { shell: ShellInternals } {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardShell],
      providers: [
        provideRouter([]),
        { provide: DASHBOARD_NAV, useValue: [] },
        { provide: BreakpointObserver, useValue: { observe: () => matches$ } },
      ],
    });
    const fixture = TestBed.createComponent(DashboardShell);
    fixture.detectChanges();
    return { shell: fixture.componentInstance as unknown as ShellInternals };
  }

  afterEach(() => matches$.next({ matches: false, breakpoints: {} }));

  it('opens the sidenav by default on desktop and toggles + persists', () => {
    const { shell } = build();

    expect(shell.compact()).toBe(false);
    expect(shell.opened()).toBe(true);

    shell.toggle();
    expect(shell.opened()).toBe(false);
    expect(localStorage.getItem('app.dashboard.sidenav-open')).toBe('false');
  });

  it('starts closed on mobile regardless of the desktop preference', () => {
    localStorage.setItem('app.dashboard.sidenav-open', 'true');
    matches$.next({ matches: true, breakpoints: {} });
    const { shell } = build();

    expect(shell.compact()).toBe(true);
    expect(shell.opened()).toBe(false);

    shell.toggle();
    expect(shell.opened()).toBe(true);
  });
});
