import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusBadge, StatusTone } from './status-badge.component';

@Component({
  imports: [StatusBadge],
  template: `<lib-status-badge [tone]="tone()">unverified</lib-status-badge>`,
})
class Host {
  tone = signal<StatusTone>('warn');
}

describe('StatusBadge', () => {
  it('projects its label and reflects the tone as a class', () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector(
      'lib-status-badge',
    );
    expect(badge?.textContent?.trim()).toBe('unverified');
    expect(badge?.className).toContain('status-badge--warn');

    fixture.componentInstance.tone.set('danger');
    fixture.detectChanges();
    expect(badge?.className).toContain('status-badge--danger');
    expect(badge?.className).not.toContain('status-badge--warn');
  });
});
