import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header.component';

@Component({
  imports: [PageHeader],
  template: `
    <lib-page-header [title]="title()" [subtitle]="subtitle()">
      <button actions>New</button>
    </lib-page-header>
  `,
})
class Host {
  title = signal('Roles');
  subtitle = signal<string | undefined>('The catalogue.');
}

describe('PageHeader', () => {
  function render() {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title, subtitle and projected actions', () => {
    const el = render().nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Roles');
    expect(el.querySelector('.page-header__subtitle')?.textContent).toContain(
      'The catalogue.',
    );
    expect(el.querySelector('.page-header__actions button')?.textContent).toBe(
      'New',
    );
  });

  it('omits the subtitle when not provided', () => {
    const fixture = render();
    fixture.componentInstance.subtitle.set(undefined);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.page-header__subtitle'),
    ).toBeNull();
  });
});
