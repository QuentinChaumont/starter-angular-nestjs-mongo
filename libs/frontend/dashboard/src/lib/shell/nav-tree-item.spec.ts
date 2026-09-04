import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '@org/frontend-i18n';
import { NavItem } from '../nav.tokens';
import { NavTreeItem } from './nav-tree-item';

@Component({ template: '' })
class Blank {}

function render(item: NavItem) {
  TestBed.configureTestingModule({
    imports: [NavTreeItem],
    providers: [
      provideRouter([{ path: '**', component: Blank }]),
      provideTranslocoTesting(),
    ],
  });
  const fixture = TestBed.createComponent(NavTreeItem);
  fixture.componentRef.setInput('item', item);
  fixture.detectChanges();
  return fixture;
}

async function navigateTo(url: string): Promise<void> {
  await TestBed.inject(Router).navigateByUrl(url);
}

function el(fixture: ReturnType<typeof render>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

const GROUP: NavItem = {
  label: 'Admin',
  icon: 'shield',
  children: [
    { label: 'Users', icon: 'group', route: 'admin' },
    { label: 'Roles', icon: 'badge', route: 'admin/roles' },
  ],
};

describe('NavTreeItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a childless item as a routed link', () => {
    const fixture = render({ label: 'Home', icon: 'home', route: '' });
    const link = el(fixture).querySelector('a[mat-list-item]');
    expect(link).not.toBeNull();
    expect(el(fixture).querySelector('[matListItemTitle]')?.textContent?.trim()).toBe('Home');
    expect(el(fixture).querySelector('button')).toBeNull();
  });

  it('renders a group as a collapsed header with no stored pref and no active child', () => {
    const fixture = render(GROUP);
    expect(el(fixture).querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
    expect(el(fixture).querySelector('.nav-tree__group')).toBeNull();
  });

  it('expands on click, revealing its children', () => {
    const fixture = render(GROUP);
    el(fixture).querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    const titles = Array.from(el(fixture).querySelectorAll('[matListItemTitle]')).map(
      (n) => n.textContent?.trim(),
    );
    expect(titles).toEqual(['Admin', 'Users', 'Roles']);
  });

  it('auto-expands once navigation lands on a descendant route', async () => {
    const fixture = render(GROUP);
    expect(el(fixture).querySelector('button')?.getAttribute('aria-expanded')).toBe('false');

    await navigateTo('/app/admin/roles');
    fixture.detectChanges();

    expect(el(fixture).querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('a manual collapse wins over an active descendant, and persists', async () => {
    const first = render(GROUP);
    await navigateTo('/app/admin/roles');
    first.detectChanges();
    expect(el(first).querySelector('button')?.getAttribute('aria-expanded')).toBe('true');

    el(first).querySelector<HTMLButtonElement>('button')?.click();
    first.detectChanges();
    expect(el(first).querySelector('button')?.getAttribute('aria-expanded')).toBe('false');

    // A fresh row for the same item, same testbed — the stored preference
    // wins over the (still active) descendant route.
    const second = TestBed.createComponent(NavTreeItem);
    second.componentRef.setInput('item', GROUP);
    second.detectChanges();
    expect(el(second).querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('bubbles navigated up from a nested leaf', () => {
    const fixture = render(GROUP);
    const emitted = jest.fn();
    fixture.componentInstance.navigated.subscribe(emitted);

    el(fixture).querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    el(fixture)
      .querySelectorAll('a[mat-list-item]')[0]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toHaveBeenCalled();
  });
});
