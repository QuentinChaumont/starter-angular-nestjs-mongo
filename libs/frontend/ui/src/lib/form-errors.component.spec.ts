import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { FormErrors } from './form-errors.component';

@Component({
  imports: [ReactiveFormsModule, FormErrors],
  template: `
    <form [formGroup]="form">
      <input formControlName="email" />
      <lib-form-errors [control]="form.controls.email" [messages]="messages" />
    </form>
  `,
})
class Host {
  private readonly fb = inject(FormBuilder);
  messages: Record<string, string> = {};
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
}

describe('FormErrors', () => {
  function render() {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();
    return fixture;
  }

  function message(fixture: ReturnType<typeof render>): string | null {
    return (
      (fixture.nativeElement as HTMLElement)
        .querySelector('.form-errors')
        ?.textContent?.trim() ?? null
    );
  }

  it('stays quiet until the control is touched', () => {
    const fixture = render();
    expect(message(fixture)).toBeNull();

    fixture.componentInstance.form.controls.email.markAsTouched();
    fixture.componentInstance.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    expect(message(fixture)).toBe('This field is required.');
  });

  it('prefers a caller-supplied message for the active error', () => {
    const fixture = render();
    fixture.componentInstance.messages = { required: 'We need your email' };
    fixture.componentInstance.form.controls.email.markAsTouched();
    fixture.componentInstance.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    expect(message(fixture)).toBe('We need your email');
  });

  it('clears once the control becomes valid', () => {
    const fixture = render();
    const email = fixture.componentInstance.form.controls.email;
    email.markAsTouched();
    email.setValue('ada@example.com');
    fixture.detectChanges();

    expect(message(fixture)).toBeNull();
  });
});
