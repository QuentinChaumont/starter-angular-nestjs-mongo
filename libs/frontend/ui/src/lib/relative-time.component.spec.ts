import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RelativeTime, RelativeTimeClock } from './relative-time.component';

@Component({
  imports: [RelativeTime],
  template: `<lib-relative-time [value]="value()" />`,
})
class Host {
  value = signal<string | null>(new Date().toISOString());
}

function text(fixture: { nativeElement: unknown }): string {
  return ((fixture.nativeElement as HTMLElement).textContent ?? '').trim();
}

describe('RelativeTime', () => {
  it('renders a coarse relative label with an absolute title', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.componentInstance.value.set(
      new Date(Date.now() - (3 * 60_000 + 20_000)).toISOString(),
    );
    fixture.detectChanges();

    expect(text(fixture)).toBe('3 min ago');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('time')?.getAttribute('title'),
    ).toBeTruthy();
  });

  it('shows "—" for a missing value', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(text(fixture)).toBe('—');
  });

  it('shares a single interval across instances and stops it when the last unmounts', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();
    const clock = TestBed.inject(RelativeTimeClock);
    expect((clock as unknown as { handle: unknown }).handle).not.toBeNull();

    fixture.destroy();
    expect((clock as unknown as { handle: unknown }).handle).toBeNull();
  });
});
