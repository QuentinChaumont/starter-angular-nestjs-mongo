import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CopyButton } from './copy-button.component';

@Component({
  imports: [CopyButton],
  template: `<lib-copy-button [value]="value" label="Copy code" />`,
})
class Host {
  value = 'ABCD-1234';
}

describe('CopyButton', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it('writes the value to the clipboard and flips to the copied state', async () => {
    const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(
      Host,
    );
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Copy code');

    button.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('ABCD-1234');
    expect(button.getAttribute('aria-label')).toBe('Copied');
  });
});
