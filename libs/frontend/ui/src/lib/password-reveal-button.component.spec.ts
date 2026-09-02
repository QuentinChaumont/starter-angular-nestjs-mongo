import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PasswordRevealButton } from './password-reveal-button.component';

@Component({
  imports: [PasswordRevealButton],
  template: `
    <input #pw type="password" />
    <lib-password-reveal-button [input]="pw" />
  `,
})
class Host {}

describe('PasswordRevealButton', () => {
  it('toggles the target input between password and text', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [Host],
    }).createComponent(Host);
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button');

    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-label')).toBe('Show password');

    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Hide password');

    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
  });
});
