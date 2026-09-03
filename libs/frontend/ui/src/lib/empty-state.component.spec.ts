import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state.component';

@Component({
  imports: [EmptyState],
  template: `
    <lib-empty-state icon="group_off" title="No users match">
      Try a different search.
      <button action>Reset</button>
    </lib-empty-state>
  `,
})
class Host {}

describe('EmptyState', () => {
  it('renders the icon, title, projected body and action', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.empty-state__icon')?.textContent?.trim()).toBe(
      'group_off',
    );
    expect(el.querySelector('.empty-state__title')?.textContent).toContain(
      'No users match',
    );
    expect(el.querySelector('.empty-state__body')?.textContent).toContain(
      'Try a different search.',
    );
    expect(el.querySelector('.empty-state__action button')?.textContent).toBe(
      'Reset',
    );
  });
});
