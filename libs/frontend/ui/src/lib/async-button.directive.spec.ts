import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { AsyncButtonDirective } from './async-button.directive';

@Component({
  imports: [MatButtonModule, AsyncButtonDirective],
  template: `
    <button
      mat-flat-button
      [libAsyncButton]="loading()"
      [busyDisabled]="invalid()"
    >
      Save
    </button>
  `,
})
class Host {
  loading = signal(false);
  invalid = signal(false);
}

describe('AsyncButtonDirective', () => {
  function render() {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();
    return fixture;
  }

  it('disables the button and shows a spinner while loading', () => {
    const fixture = render();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.disabled).toBe(false);
    expect(button.querySelector('svg.lib-async-button__spinner')).toBeNull();

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('svg.lib-async-button__spinner')).not.toBeNull();

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(button.querySelector('svg.lib-async-button__spinner')).toBeNull();
  });

  it('folds in the busyDisabled condition', () => {
    const fixture = render();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.querySelector('svg.lib-async-button__spinner')).toBeNull();
  });
});
